import React, { useState, useEffect, useRef } from 'react';
import { api, type ClientProfile, type CoachingPlan, type CoachingMessage } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export const CoachingPortalApp: React.FC = () => {
  const [role, setRole] = useState<'TRAINEE' | 'COACH'>('TRAINEE');
  
  // Trainee View State
  const [subscribedCoaches, setSubscribedCoaches] = useState<any[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<CoachingPlan[]>([]);
  const [traineeMessages, setTraineeMessages] = useState<CoachingMessage[]>([]);
  const [traineeInput, setTraineeInput] = useState('');
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimmerType, setTrimmerType] = useState<'NORMAL' | 'LARGE'>('NORMAL');
  const [trimRange, setTrimRange] = useState([0, 15]); // 15 seconds trim

  // Coach View State
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('user_alex');
  const [clientPlans, setClientPlans] = useState<CoachingPlan[]>([]);
  const [clientMessages, setClientMessages] = useState<CoachingMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Calorie adjustments
  const [tempCalorieTarget, setTempCalorieTarget] = useState(1800);

  // Form check video player states (Trainer View)
  const [activeVideoMsg, setActiveVideoMsg] = useState<CoachingMessage | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');

  // Plan assignment form states (Trainer View)
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutInput, setWorkoutInput] = useState('');
  const [mealInput, setMealInput] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; workout: string; meal: string }[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ workout: string; meal: string } | null>(null);

  useEffect(() => {
    // Initial fetch of data
    const subs = JSON.parse(localStorage.getItem('fithub_subs') || '[]');
    setSubscribedCoaches(subs);

    api.coaching.getClients()
      .then(res => {
        setClients(res);
        // Load templates
        const storedTemplates = JSON.parse(localStorage.getItem('fithub_templates') || '[]');
        setTemplates(storedTemplates);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Fetch Trainee view assignments and chat
  useEffect(() => {
    if (role === 'TRAINEE' && subscribedCoaches.length > 0) {
      const coachId = subscribedCoaches[0].coachId;
      api.coaching.getAssignedPlans('me').then(setAssignedPlans);
      api.coaching.getMessages(coachId).then(setTraineeMessages);
    }
  }, [role, subscribedCoaches]);

  // Fetch Coach view selections
  useEffect(() => {
    if (role === 'COACH' && selectedClientId) {
      api.coaching.getAssignedPlans(selectedClientId).then(setClientPlans);
      api.coaching.getMessages(selectedClientId).then(setClientMessages);
      const client = clients.find(c => c.userId === selectedClientId);
      if (client) {
        setTempCalorieTarget(client.biometrics.dailyCalories);
      }
    }
  }, [role, selectedClientId, clients]);

  // ── TRAINEE HANDLERS ────────────────────────────────────────────────────────
  const handleTraineeSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeInput.trim() || subscribedCoaches.length === 0) return;
    const coachId = subscribedCoaches[0].coachId;
    const newMsg = await api.coaching.sendMessage(coachId, traineeInput);
    setTraineeMessages(prev => [...prev, newMsg]);
    setTraineeInput('');
  };

  const handleSimulateVideoUpload = () => {
    setShowTrimmer(true);
  };

  const executeVideoSend = async () => {
    setShowTrimmer(false);
    if (subscribedCoaches.length === 0) return;
    const coachId = subscribedCoaches[0].coachId;

    const mockVideoUrl = trimmerType === 'LARGE' 
      ? 'https://www.w3schools.com/html/mov_bbb.mp4' // Big Buck Bunny sample
      : 'https://www.w3schools.com/html/movie.mp4';  // Bear sample
    const duration = trimRange[1] - trimRange[0];

    const newMsg = await api.coaching.sendMessage(
      coachId, 
      `🏋️‍♂️ [Form-Check Video]: Sent trimmed ${duration}s clip for form analysis.`,
      mockVideoUrl,
      duration
    );
    setTraineeMessages(prev => [...prev, newMsg]);
  };

  // ── COACH HANDLERS ──────────────────────────────────────────────────────────
  const handleCoachSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim() || !selectedClientId) return;
    const newMsg = await api.coaching.sendMessage(selectedClientId, coachInput);
    setClientMessages(prev => [...prev, newMsg]);
    setCoachInput('');
  };

  const handleUpdateCalorieTarget = async () => {
    await api.coaching.updateCalorieTarget(selectedClientId, tempCalorieTarget);
    const updatedClients = await api.coaching.getClients();
    setClients(updatedClients);
    alert('Calorie targets updated successfully!');
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutInput.trim() && !mealInput.trim()) return;

    // Check conflict
    const conflict = clientPlans.some(p => p.date === assignDate);
    if (conflict) {
      setPendingPlan({ workout: workoutInput, meal: mealInput });
      setShowConflictModal(true);
      return;
    }

    await savePlan(assignDate, workoutInput, mealInput);
  };

  const savePlan = async (date: string, workout: string, meal: string, append = false) => {
    let finalWorkout = workout;
    let finalMeal = meal;

    if (append) {
      const existing = clientPlans.find(p => p.date === date);
      if (existing) {
        finalWorkout = existing.workout ? `${existing.workout}\n---\n${workout}` : workout;
        finalMeal = existing.mealInstructions ? `${existing.mealInstructions}\n---\n${meal}` : meal;
      }
    }

    await api.coaching.assignPlan(selectedClientId, date, finalWorkout, finalMeal);
    
    // Save as template
    if (saveAsTemplate) {
      const newTpl = { id: Math.random().toString(), workout, meal };
      const newTemplates = [...templates, newTpl];
      setTemplates(newTemplates);
      localStorage.setItem('fithub_templates', JSON.stringify(newTemplates));
    }

    // Refresh plans list
    const updatedPlans = await api.coaching.getAssignedPlans(selectedClientId);
    setClientPlans(updatedPlans);

    // Reset inputs
    setWorkoutInput('');
    setMealInput('');
    setSaveAsTemplate(false);
    setShowConflictModal(false);
    alert('Plan successfully assigned to calendar!');
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideoMsg || !feedbackNote.trim()) return;

    await api.coaching.addVideoFeedback(selectedClientId, activeVideoMsg.id, videoTimestamp, feedbackNote);
    
    // Refresh messages
    const updatedMsgs = await api.coaching.getMessages(selectedClientId);
    setClientMessages(updatedMsgs);
    
    // Update active video detail
    const updatedActive = updatedMsgs.find(m => m.id === activeVideoMsg.id);
    if (updatedActive) setActiveVideoMsg(updatedActive);

    setFeedbackNote('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      
      {/* Role Selector Header */}
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded-2xl p-4 mb-8 shadow-sm">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Switch Portal Perspective:</span>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setRole('TRAINEE')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              role === 'TRAINEE' ? 'bg-primary-dark text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trainee View
          </button>
          <button
            onClick={() => setRole('COACH')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              role === 'COACH' ? 'bg-primary-dark text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Coach View
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary-dark border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── TRAINEE VIEW ────────────────────────────────────────────────── */}
          {role === 'TRAINEE' && (
            subscribedCoaches.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-10 md:p-16 text-center shadow-xl max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">No Active Coaching Subscription</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Unlock the 1-on-1 Coaching Portal by subscribing to one of our expert trainers in the marketplace.
                </p>
                <a href="/coaches" className="inline-block bg-primary-dark text-white font-bold px-8 py-3.5 rounded-full hover:bg-black transition-colors shadow-lg">
                  Explore Coach Marketplace
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left side: Calendar assignments */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    My Custom Coaching Plan
                  </h3>
                  
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
                      // Map to sample date format for testing
                      const testDates = ['2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'];
                      const dStr = testDates[idx];
                      const dayPlan = assignedPlans.find(p => p.date === dStr);

                      return (
                        <div key={day} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-800">{day}</span>
                            <span className="text-xs text-gray-400 font-medium">{dStr}</span>
                          </div>

                          {dayPlan ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">🏋️‍♂️ Assigned Workout</span>
                                <p className="text-sm font-semibold text-gray-800 mt-1 whitespace-pre-line">{dayPlan.workout}</p>
                              </div>
                              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">🥗 Dietary Instructions</span>
                                <p className="text-sm font-semibold text-gray-800 mt-1 whitespace-pre-line">{dayPlan.mealInstructions}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No instructions set for this day.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: Chat & Video Form-Check */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
                  
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                      <h4 className="font-bold text-gray-900">Coaching Conversation</h4>
                      <p className="text-xs text-emerald-600 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Online Support
                      </p>
                    </div>
                  </div>

                  {/* Message Logs */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {traineeMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                          msg.senderId === 'me' ? 'bg-primary-dark text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          {msg.videoUrl && (
                            <div className="mt-3 bg-black/10 rounded-lg p-2 border border-black/10 flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold">📹 Form Check Clip ({msg.videoDuration}s)</span>
                              <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Trimmed</span>
                            </div>
                          )}
                          <span className="text-[10px] opacity-60 block text-right mt-2">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Inputs */}
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <form onSubmit={handleTraineeSend} className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSimulateVideoUpload}
                        className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all flex items-center gap-2"
                        title="Upload Form Check Video"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      </button>
                      <input
                        type="text"
                        value={traineeInput}
                        onChange={e => setTraineeInput(e.target.value)}
                        placeholder="Message your coach..."
                        className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                      />
                      <button type="submit" className="p-3 bg-primary-dark text-white font-bold rounded-xl hover:bg-black transition-colors">
                        Send
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )
          )}

          {/* ── COACH VIEW ──────────────────────────────────────────────────── */}
          {role === 'COACH' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Clients List & Progress Info */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Client List selector panel */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">My Roster</h3>
                  
                  <div className="space-y-3">
                    {clients.map(client => {
                      const isSelected = client.userId === selectedClientId;
                      let badgeColor = 'bg-emerald-100 text-emerald-800';
                      let statusText = 'Excellent';
                      if (client.adherenceScore < 50) {
                        badgeColor = 'bg-red-100 text-red-800';
                        statusText = 'At Risk';
                      } else if (client.adherenceScore < 80) {
                        badgeColor = 'bg-yellow-100 text-yellow-800';
                        statusText = 'Needs Check';
                      }

                      return (
                        <div
                          key={client.userId}
                          onClick={() => setSelectedClientId(client.userId)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary-dark bg-primary-dark/5' 
                              : 'border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800">{client.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span>Adherence: {client.adherenceScore}%</span>
                            <span>Goal: {client.goal.replace('_', ' ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Adherence & biometrics panel */}
                {selectedClientId && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
                    <h3 className="text-lg font-bold text-gray-900">Client Nutrition Targets</h3>
                    
                    {(() => {
                      const client = clients.find(c => c.userId === selectedClientId);
                      if (!client) return null;

                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Adjust Calorie Target</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={tempCalorieTarget}
                                onChange={e => setTempCalorieTarget(Number(e.target.value))}
                                className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none border border-gray-200"
                              />
                              <button onClick={handleUpdateCalorieTarget} className="bg-primary-dark text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-black transition-colors whitespace-nowrap">
                                Set Target
                              </button>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">Carbs</span>
                              <p className="text-sm font-black text-gray-800 mt-1">{client.biometrics.carbs}g</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">Protein</span>
                              <p className="text-sm font-black text-gray-800 mt-1">{client.biometrics.protein}g</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">Fat</span>
                              <p className="text-sm font-black text-gray-800 mt-1">{client.biometrics.fat}g</p>
                            </div>
                          </div>

                          {/* Weight logs visualization table */}
                          <div className="pt-4 border-t border-gray-100">
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Weight History</span>
                            <div className="space-y-1.5">
                              {client.weightLogs.map(log => (
                                <div key={log.date} className="flex justify-between text-xs text-gray-600">
                                  <span>{log.date}</span>
                                  <span className="font-bold text-gray-800">{log.weight} kg</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>

              {/* Middle Column: Assign Custom Fitness/Meal Plans */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Plan assigner form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Custom Plan</h3>
                  
                  <form onSubmit={handleAssignPlan} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Target Date</label>
                      <input
                        type="date"
                        value={assignDate}
                        onChange={e => setAssignDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Fitness Routine Details</label>
                      <textarea
                        value={workoutInput}
                        onChange={e => setWorkoutInput(e.target.value)}
                        placeholder="e.g. Squats 3x5 @ 100kg&#10;Bench Press 3x5 @ 80kg&#10;Pullups 3xMax"
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none placeholder:text-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Meal Instructions</label>
                      <textarea
                        value={mealInput}
                        onChange={e => setMealInput(e.target.value)}
                        placeholder="e.g. Aim for 150g protein today. Keep carbs high before the workout."
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none placeholder:text-gray-300"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="save-tpl"
                        checked={saveAsTemplate}
                        onChange={e => setSaveAsTemplate(e.target.checked)}
                        className="accent-primary-dark"
                      />
                      <label htmlFor="save-tpl" className="text-xs text-gray-600 select-none">Save as Reuseable Template</label>
                    </div>

                    <button type="submit" className="w-full bg-primary-dark text-white font-bold py-2.5 rounded-lg hover:bg-black transition-colors">
                      Assign to Trainee's Calendar
                    </button>
                  </form>
                </div>

                {/* Templates list panel */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Saved Templates</h3>
                  {templates.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No saved templates yet. Check the box when assigning a plan.</p>
                  ) : (
                    <div className="space-y-2">
                      {templates.map(tpl => (
                        <div key={tpl.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Workout Template</span>
                            <p className="text-xs text-gray-800 truncate mt-0.5">{tpl.workout}</p>
                          </div>
                          <button
                            onClick={() => {
                              setWorkoutInput(tpl.workout);
                              setMealInput(tpl.meal);
                            }}
                            className="text-xs text-primary-dark font-bold hover:underline shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Coach Chat & Video Overlay analysis */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
                
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div>
                    <h4 className="font-bold text-gray-900">Communication Desk</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Hired Coach perspective</p>
                  </div>
                </div>

                {/* Chat history */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {clientMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.senderId === 'me' ? 'bg-primary-dark text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        
                        {/* Video form check selector */}
                        {msg.videoUrl && (
                          <button
                            onClick={() => setActiveVideoMsg(msg)}
                            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-3 w-full flex items-center justify-between gap-3 text-xs font-bold transition-colors shadow-sm"
                          >
                            <span>📹 Review Form Check ({msg.videoDuration}s)</span>
                            <span className="text-[9px] uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">Analyze</span>
                          </button>
                        )}

                        <span className="text-[10px] opacity-60 block text-right mt-2">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Inputs */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <form onSubmit={handleCoachSend} className="flex gap-2">
                    <input
                      type="text"
                      value={coachInput}
                      onChange={e => setCoachInput(e.target.value)}
                      placeholder="Reply to client..."
                      className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                    />
                    <button type="submit" className="px-5 py-2.5 bg-primary-dark text-white font-bold rounded-xl hover:bg-black transition-colors text-sm">
                      Reply
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}
        </>
      )}

      {/* ── CONFLICT RESOLUTION MODAL (UC-14 A1) ────────────────────────────────── */}
      <AnimatePresence>
        {showConflictModal && pendingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConflictModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Schedule Conflict detected</h4>
              <p className="text-sm text-gray-600 mb-6">
                A custom routine has already been assigned on {assignDate}. How would you like to resolve this conflict?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => savePlan(assignDate, pendingPlan.workout, pendingPlan.meal, true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors font-semibold shadow"
                >
                  Append Routine
                </button>
                <button
                  onClick={() => savePlan(assignDate, pendingPlan.workout, pendingPlan.meal, false)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors font-semibold shadow"
                >
                  Overwrite Routine
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TRAINEE VIDEO UPLOAD / TRIMMER MODAL (UC-16 A1) ────────────────────────── */}
      <AnimatePresence>
        {showTrimmer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrimmer(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Upload Form Check</h4>
              
              <div className="space-y-4 mb-6">
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Simulate Video File Size</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTrimmerType('NORMAL')}
                      className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all ${
                        trimmerType === 'NORMAL' 
                          ? 'border-primary-dark bg-primary-dark/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-bold text-sm">Normal Clip</span>
                      <span className="text-xs text-gray-500">12 MB / 15 seconds</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimmerType('LARGE')}
                      className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all ${
                        trimmerType === 'LARGE' 
                          ? 'border-primary-dark bg-primary-dark/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-bold text-sm text-red-600">Large Raw Video</span>
                      <span className="text-xs text-gray-500">150 MB / 2 minutes</span>
                    </button>
                  </div>
                </div>

                {trimmerType === 'LARGE' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs text-red-700 font-semibold mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      File size exceeds 100MB / 60 seconds limit. Built-in trimmer required.
                    </p>
                    <div className="bg-gray-100 p-2.5 rounded-lg border border-gray-200">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase mb-2">Trim Video Range</span>
                      <div className="flex justify-between items-center text-xs text-gray-700">
                        <span>Range: 0:00 - 0:15</span>
                        <span className="font-bold text-emerald-600">Output: 12MB</span>
                      </div>
                      <div className="w-full bg-gray-300 h-1.5 rounded-full mt-2 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full bg-primary-dark w-[12.5%]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTrimmer(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={executeVideoSend}
                  className="px-5 py-2 bg-primary-dark text-white rounded-lg text-sm transition-colors font-semibold shadow hover:bg-black"
                >
                  {trimmerType === 'LARGE' ? '✂️ Trim & Send' : 'Upload & Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MOCK VIDEO FEEDBACK / OVERLAY PANEL (UC-16 Basic Flow 4-5) ─────────────── */}
      <AnimatePresence>
        {activeVideoMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveVideoMsg(null)} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
              
              {/* Left Column: Player and timeline markers */}
              <div className="flex-1 bg-black flex flex-col relative justify-center">
                {/* Embedded HTML5 Video player */}
                <video
                  src={activeVideoMsg.videoUrl}
                  controls
                  className="w-full h-auto object-contain max-h-[350px]"
                />
                
                {/* Timeline overlay indicators */}
                <div className="p-3 bg-black/40 border-t border-white/10">
                  <span className="block text-[10px] text-white/50 font-bold uppercase mb-1.5">Feedback Timeline Pins</span>
                  <div className="flex gap-2">
                    {activeVideoMsg.feedbackNotes?.map(note => (
                      <span key={note.id} className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded cursor-pointer hover:bg-blue-500" title={note.note}>
                        📌 {note.timestamp}s
                      </span>
                    ))}
                    {(!activeVideoMsg.feedbackNotes || activeVideoMsg.feedbackNotes.length === 0) && (
                      <span className="text-xs text-white/40 italic">No overlay pins yet. Mark a spot on the right to pin.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Feedback input and log list */}
              <div className="w-full md:w-80 bg-white border-l border-gray-100 p-4 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-900">Form-Check Notes</h4>
                  <button onClick={() => setActiveVideoMsg(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                  {activeVideoMsg.feedbackNotes?.map(note => (
                    <div key={note.id} className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-xs text-gray-700">
                      <span className="font-bold text-blue-600">At {note.timestamp}s:</span>
                      <p className="mt-1 leading-relaxed">{note.note}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddFeedback} className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Timestamp (s)</span>
                    <input
                      type="number"
                      min={0}
                      max={activeVideoMsg.videoDuration || 60}
                      value={videoTimestamp}
                      onChange={e => setVideoTimestamp(Number(e.target.value))}
                      className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.target.value)}
                    placeholder="e.g. Try to keep your back straighter. Focus on core activation."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none resize-none placeholder:text-gray-300"
                  />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
                    Add Feedback Note
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
