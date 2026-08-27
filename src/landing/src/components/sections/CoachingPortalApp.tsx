import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  api,
  type ClientProfile,
  type CoachingPlan,
  type CoachingMessage,
  type SubscribedCoach,
} from '../../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

// Get the next 7 days starting from today
function getWeekDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { label: d.toLocaleDateString('en-US', { weekday: 'long' }), iso: isoDate(d) };
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
);

const EmptyState: React.FC<{ icon: string; title: string; desc: string; cta?: React.ReactNode }> = ({
  icon, title, desc, cta
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
    <span className="text-5xl">{icon}</span>
    <div>
      <p className="font-bold text-white text-lg">{title}</p>
      <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">{desc}</p>
    </div>
    {cta}
  </div>
);

// ── Chat Bubble ────────────────────────────────────────────────────────────────

const ChatBubble: React.FC<{
  msg: CoachingMessage;
  meId: string;
  onAnalyze?: (msg: CoachingMessage) => void;
}> = ({ msg, meId, onAnalyze }) => {
  const isMe = msg.senderId === meId;
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isMe
            ? 'bg-[#252630] border border-surface-edge text-white rounded-tr-none'
            : 'bg-[#1e1f26] border border-surface-edge text-white rounded-tl-none'
        }`}
      >
        {!isMe && (
          <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
            {msg.sender?.name ?? 'Coach'}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

        {msg.mediaUrl && (
          <div className="mt-2.5 space-y-2">
            <video
              src={msg.mediaUrl}
              controls
              playsInline
              className="w-full max-h-48 rounded-xl border border-surface-edge/40 bg-black/60 object-contain"
            />
            <button
              onClick={() => onAnalyze?.(msg)}
              className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors bg-black/20 hover:bg-black/30 text-white"
            >
              <span className="text-xs font-bold flex items-center gap-1.5">
                📹 Form Check ({msg.videoDuration ?? '?'}s)
              </span>
              {!isMe && (
                <span className="text-[10px] uppercase tracking-widest font-bold bg-white/20 px-2 py-0.5 rounded">
                  Analyze
                </span>
              )}
            </button>
          </div>
        )}

        {msg.feedbackNotes && msg.feedbackNotes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {msg.feedbackNotes.map(n => (
              <div
                key={n.id}
                className="rounded-lg px-2 py-1.5 text-xs bg-black/20 text-white"
              >
                <span className="font-bold text-amber-300">At {n.timestamp}s:</span>
                <span className="ml-1 opacity-90">{n.note}</span>
              </div>
            ))}
          </div>
        )}

          <p className="text-[10px] text-right mt-2 opacity-50">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const CoachingPortalApp: React.FC = () => {
  const [meId, setMeId] = useState('');
  const [userRole, setUserRole] = useState<'USER' | 'COACH' | 'ADMIN'>('USER');
  const [viewAs, setViewAs] = useState<'TRAINEE' | 'COACH'>('TRAINEE');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Trainee State ──────────────────────────────────────────────────────────
  const [myCoaches, setMyCoaches] = useState<SubscribedCoach[]>([]);
  const [myPlans, setMyPlans] = useState<CoachingPlan[]>([]);
  const [activeCoachId, setActiveCoachId] = useState<string>('');
  const [traineeMessages, setTraineeMessages] = useState<CoachingMessage[]>([]);
  const [traineeInput, setTraineeInput] = useState('');

  // ── Coach State ────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientPlans, setClientPlans] = useState<CoachingPlan[]>([]);
  const [clientMessages, setClientMessages] = useState<CoachingMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [tempCalories, setTempCalories] = useState(2000);

  // ── Plan Assign Form (Coach) ───────────────────────────────────────────────
  const [assignDate, setAssignDate] = useState(isoDate(new Date()));
  const [workoutInput, setWorkoutInput] = useState('');
  const [mealInput, setMealInput] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; workout: string; meal: string }[]>([]);
  const [showConflict, setShowConflict] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ workout: string; meal: string } | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Video Form-Check (Coach) ───────────────────────────────────────────────
  const [activeVideoMsg, setActiveVideoMsg] = useState<CoachingMessage | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // ── Video Upload (Trainee) ─────────────────────────────────────────────────
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimmerType, setTrimmerType] = useState<'NORMAL' | 'LARGE'>('NORMAL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number>(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Mock Subscribe ─────────────────────────────────────────────────────────
  const [allCoachesForPicker, setAllCoachesForPicker] = useState<{ userId: string; coachProfile?: { specialty: string }; name: string }[]>([]);
  const [showMockSubscribe, setShowMockSubscribe] = useState(false);
  const [mockSubLoading, setMockSubLoading] = useState(false);
  const [selectedMockCoachId, setSelectedMockCoachId] = useState('');
  const [mockAddClientLoading, setMockAddClientLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Initialise ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('fithub_token');
    const user = JSON.parse(localStorage.getItem('fithub_user') || 'null');
    if (!token || !user) { setLoading(false); return; }

    setIsLoggedIn(true);
    setMeId(user.id);

    const storedTpl = JSON.parse(localStorage.getItem('fithub_templates') || '[]');
    setTemplates(storedTpl);

    // Always fetch fresh user profile from API so role is current (not stale from localStorage)
    api.users.me()
      .then(freshUser => {
        const role = (freshUser.role ?? user.role ?? 'USER') as 'USER' | 'COACH' | 'ADMIN';
        setUserRole(role);
        const view = role === 'COACH' ? 'COACH' : 'TRAINEE';
        setViewAs(view);
        // Update localStorage so subsequent loads are faster
        localStorage.setItem('fithub_user', JSON.stringify({ ...user, role }));
        return role;
      })
      .catch(() => {
        // Fall back to cached role if API is down
        const role = (user.role ?? 'USER') as 'USER' | 'COACH' | 'ADMIN';
        setUserRole(role);
        if (role === 'COACH') setViewAs('COACH');
        return role;
      })
      .then(() => {
        // Load initial data
        return Promise.all([
          api.coaching.getMyCoaches().catch(() => []),
          api.coaching.getMyPlans().catch(() => []),
          api.coaching.getClients().catch(() => []),
        ]);
      })
      .then(([coaches, plans, clients]) => {
        setMyCoaches(coaches);
        setMyPlans(plans);
        setClients(clients);
        if (coaches.length > 0) setActiveCoachId(coaches[0].coachId);
        if (clients.length > 0) setSelectedClientId(clients[0].userId);
        setLoading(false);
      });
  }, []);

  // Load trainee messages when coach selection changes
  useEffect(() => {
    if (viewAs === 'TRAINEE' && activeCoachId) {
      api.coaching.getMessages(activeCoachId).then(setTraineeMessages).catch(() => {});
    }
  }, [viewAs, activeCoachId]);

  // Load coach messages + plans when client changes
  useEffect(() => {
    if (viewAs === 'COACH' && selectedClientId) {
      const client = clients.find(c => c.userId === selectedClientId);
      if (client?.biometrics) setTempCalories(client.biometrics.dailyCalories);

      Promise.all([
        api.coaching.getClientPlans(selectedClientId).catch(() => []),
        api.coaching.getMessages(selectedClientId).catch(() => []),
      ]).then(([plans, msgs]) => {
        setClientPlans(plans);
        setClientMessages(msgs);
      });
    }
  }, [viewAs, selectedClientId, clients]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [traineeMessages, clientMessages]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTraineeSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeInput.trim() || !activeCoachId) return;
    const msg = await api.coaching.sendMessage(activeCoachId, traineeInput);
    setTraineeMessages(prev => [...prev, msg]);
    setTraineeInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    // Auto-detect video duration if possible
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.round(video.duration);
      setVideoDurationSec(duration);
      if (duration > 60) {
        setTrimmerType('LARGE');
      } else {
        setTrimmerType('NORMAL');
      }
    };
    video.src = URL.createObjectURL(file);
  };

  const handleVideoUpload = async () => {
    if (!activeCoachId) return;

    if (!selectedFile) {
      alert('Please select a video file first.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get presigned signature from our backend
      const { timestamp, signature, cloudName, apiKey, folder } = await api.coaching.getUploadSignature();

      // 2. Upload file to Cloudinary via XMLHttpRequest so we can track progress
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      const uploadPromise = new Promise<{ secure_url: string; duration: number }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
      });

      xhr.send(formData);

      const result = await uploadPromise;

      // Determine duration (use auto-extracted Cloudinary duration, or state fallback)
      const finalDuration = Math.round(result.duration) || videoDurationSec;

      // 3. Send message to coach with Cloudinary secure URL
      const msg = await api.coaching.sendMessage(
        activeCoachId,
        `🏋️ [Form-Check Video] Sent for your review. File: ${selectedFile.name}`,
        result.secure_url,
        finalDuration
      );

      setTraineeMessages(prev => [...prev, msg]);
      setShowTrimmer(false);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload video: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCoachSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim() || !selectedClientId) return;
    const msg = await api.coaching.sendMessage(selectedClientId, coachInput);
    setClientMessages(prev => [...prev, msg]);
    setCoachInput('');
  };

  const handleMockAddClient = async () => {
    setMockAddClientLoading(true);
    try {
      await api.coaching.mockAddClient();
      const updated = await api.coaching.getClients();
      setClients(updated);
      if (updated.length > 0) setSelectedClientId(updated[0].userId);
    } catch (err: any) {
      alert('Error adding mock client: ' + err.message);
    } finally {
      setMockAddClientLoading(false);
    }
  };

  const handleUpdateCalories = async () => {
    await api.coaching.updateCalorieTarget(selectedClientId, tempCalories);
    const updated = await api.coaching.getClients();
    setClients(updated);
    alert('✓ Calorie target updated!');
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutInput.trim() && !mealInput.trim()) return;
    const conflict = clientPlans.some(p => isoDate(new Date(p.date)) === assignDate);
    if (conflict) {
      setPendingPlan({ workout: workoutInput, meal: mealInput });
      setShowConflict(true);
      return;
    }
    await savePlan(false);
  };

  const savePlan = async (append: boolean) => {
    setAssignLoading(true);
    try {
      const plan = await api.coaching.assignPlan(
        selectedClientId,
        assignDate,
        workoutInput,
        mealInput,
        append
      );
      const updated = await api.coaching.getClientPlans(selectedClientId);
      setClientPlans(updated);
      if (saveAsTemplate) {
        const tpl = { id: plan.id, workout: workoutInput, meal: mealInput };
        const newTpls = [...templates, tpl];
        setTemplates(newTpls);
        localStorage.setItem('fithub_templates', JSON.stringify(newTpls));
      }
      setWorkoutInput('');
      setMealInput('');
      setSaveAsTemplate(false);
      setShowConflict(false);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideoMsg || !feedbackNote.trim()) return;
    setFeedbackLoading(true);
    try {
      await api.coaching.addVideoFeedback(activeVideoMsg.id, videoTimestamp, feedbackNote);
      const updated = await api.coaching.getMessages(selectedClientId);
      setClientMessages(updated);
      const updatedActive = updated.find(m => m.id === activeVideoMsg.id);
      if (updatedActive) setActiveVideoMsg(updatedActive);
      setFeedbackNote('');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleMockSubscribe = async () => {
    if (!selectedMockCoachId) return;
    setMockSubLoading(true);
    try {
      await api.coaching.mockSubscribe(selectedMockCoachId);
      const coaches = await api.coaching.getMyCoaches();
      const plans = await api.coaching.getMyPlans();
      setMyCoaches(coaches);
      setMyPlans(plans);
      if (coaches.length > 0) setActiveCoachId(coaches[0].coachId);
      setShowMockSubscribe(false);
    } finally {
      setMockSubLoading(false);
    }
  };

  // ── Loading / Auth guard ───────────────────────────────────────────────────

  if (!isLoggedIn && !loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
        <span className="text-6xl">🔐</span>
        <div>
          <p className="text-2xl font-bold text-white">Login Required</p>
          <p className="text-text-muted mt-2">Please log in to access the 1-on-1 Coaching Portal.</p>
        </div>
        <a href="/login" className="bg-primary text-surface font-bold px-8 py-3.5 rounded-full hover:bg-primary-light transition-all">
          Log In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const weekDays = getWeekDays();

  return (
    <div className="text-white pb-20">

      {/* ── Role Selector ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <p className="text-text-muted text-sm">
          Viewing as: <span className="text-white font-bold">{viewAs === 'TRAINEE' ? 'Trainee' : 'Coach'}</span>
        </p>
        <div className="flex items-center bg-[#1e1f26] border border-surface-edge rounded-full p-1">
          {(['TRAINEE', 'COACH'] as const).map(r => (
            <button
              key={r}
              onClick={() => setViewAs(r)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                viewAs === r ? 'bg-primary text-surface' : 'text-text-muted hover:text-white'
              }`}
            >
              {r === 'TRAINEE' ? '🏋️ Trainee View' : '🎓 Coach View'}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TRAINEE VIEW ─────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewAs === 'TRAINEE' && (
        myCoaches.length === 0 ? (
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-10 md:p-16 text-center max-w-xl mx-auto">
            <EmptyState
              icon="🎓"
              title="No Active Coaching Subscription"
              desc="Subscribe to a coach in the marketplace to unlock the 1-on-1 portal, or use the test button below to instantly simulate a subscription."
              cta={
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  <a href="/coaches" className="bg-primary text-surface font-bold px-6 py-3 rounded-full hover:bg-primary-light transition-all text-sm">
                    Browse Coaches
                  </a>
                  <button
                    onClick={async () => {
                      const coaches = await api.coaches.search({});
                      setAllCoachesForPicker(coaches.map(c => ({ userId: c.userId, name: c.user.name, coachProfile: c })));
                      setShowMockSubscribe(true);
                    }}
                    className="bg-surface border border-surface-edge text-text-muted font-bold px-6 py-3 rounded-full hover:border-primary hover:text-white transition-all text-sm"
                  >
                    🔧 Dev: Mock Subscribe
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left — Calendar / Plans */}
            <div className="lg:col-span-7 space-y-6">

              {/* Coach selector */}
              {myCoaches.length > 1 && (
                <div className="bg-[#1e1f26] border border-surface-edge rounded-2xl p-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-3">Active Coaches</p>
                  <div className="flex flex-wrap gap-2">
                    {myCoaches.map(c => (
                      <button
                        key={c.coachId}
                        onClick={() => { setActiveCoachId(c.coachId); api.coaching.getMessages(c.coachId).then(setTraineeMessages); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                          activeCoachId === c.coachId
                            ? 'bg-primary text-surface border-primary'
                            : 'border-surface-edge text-text-muted hover:border-primary'
                        }`}
                      >
                        {c.coachName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Plan Calendar */}
              <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                  <span className="text-primary">📅</span> My Coaching Plan — This Week
                </h3>
                <div className="space-y-3">
                  {weekDays.map(({ label, iso }) => {
                    const plan = myPlans.find(p => isoDate(new Date(p.date)) === iso);
                    const isToday = iso === isoDate(new Date());
                    return (
                      <div
                        key={iso}
                        className={`rounded-2xl border p-4 transition-colors ${
                          isToday ? 'border-primary/40 bg-primary/5' : 'border-surface-edge/60 hover:border-surface-edge'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isToday ? 'text-primary' : 'text-white'}`}>{label}</span>
                            {isToday && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Today</span>}
                          </div>
                          <span className="text-[11px] text-text-muted">{iso}</span>
                        </div>

                        {plan ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-surface-edge/40">
                            {plan.workout && (
                              <div className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">🏋️ Workout</p>
                                <p className="text-xs text-white whitespace-pre-line leading-relaxed">{plan.workout}</p>
                              </div>
                            )}
                            {plan.mealInstructions && (
                              <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">🥗 Meal Plan</p>
                                <p className="text-xs text-white whitespace-pre-line leading-relaxed">{plan.mealInstructions}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-text-disabled italic mt-1">No plan assigned for this day.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right — Chat */}
            <div className="lg:col-span-5 bg-[#1e1f26] border border-surface-edge rounded-3xl flex flex-col overflow-hidden" style={{ height: '680px' }}>
              <div className="p-5 border-b border-surface-edge/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Coach Chat</h4>
                  <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                    {myCoaches.find(c => c.coachId === activeCoachId)?.coachName ?? 'Your Coach'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {traineeMessages.length === 0 ? (
                  <EmptyState icon="💬" title="No messages yet" desc="Start the conversation with your coach!" />
                ) : (
                  traineeMessages.map(msg => (
                    <ChatBubble key={msg.id} msg={msg} meId={meId} />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-surface-edge/60 bg-[#16171e]">
                <form onSubmit={handleTraineeSend} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrimmer(true)}
                    className="p-2.5 bg-surface border border-surface-edge rounded-xl text-text-muted hover:text-primary hover:border-primary transition-all"
                    title="Upload Form Check Video"
                  >
                    📹
                  </button>
                  <input
                    type="text"
                    value={traineeInput}
                    onChange={e => setTraineeInput(e.target.value)}
                    placeholder="Message your coach..."
                    className="flex-1 bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-sm placeholder-text-disabled focus:outline-none focus:border-primary transition-colors"
                  />
                  <button type="submit" className="bg-primary text-surface font-bold px-4 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm">
                    Send
                  </button>
                </form>
              </div>
            </div>

          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── COACH VIEW ────────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewAs === 'COACH' && (
        clients.length === 0 ? (
          <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-16 max-w-xl mx-auto text-center">
            <div className="text-5xl mb-5">👥</div>
            <h3 className="text-xl font-black uppercase text-white mb-2">No Active Clients</h3>
            <p className="text-text-muted text-sm mb-8">
              Your client roster is empty. Clients will appear here once they subscribe to your coaching plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/coaches/become"
                className="bg-surface border border-surface-edge text-text-muted font-bold px-5 py-3 rounded-full hover:border-primary hover:text-primary transition-all text-sm"
              >
                ⚙ Manage Coach Profile
              </a>
              <button
                onClick={handleMockAddClient}
                disabled={mockAddClientLoading}
                className="bg-primary text-surface font-black px-5 py-3 rounded-full hover:bg-primary-light transition-all text-sm disabled:opacity-50"
              >
                {mockAddClientLoading ? 'Adding…' : '＋ Add Test Client'}
              </button>
            </div>
            <p className="text-[10px] text-text-disabled mt-4">
              "Add Test Client" creates a dummy trainee subscribed to you — for development only.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Trainee Switcher — always visible in coach view ──── */}
            <div className="bg-[#1e1f26] border border-surface-edge rounded-2xl p-4">
              <p className="text-[10px] font-bold text-text-disabled uppercase tracking-widest mb-3">
                Active Trainees · {clients.length} total
              </p>
                <div className="flex flex-wrap gap-2">
                  {clients.map(client => {
                    const isSelected = client.userId === selectedClientId;
                    const s = client.adherenceScore;
                    const dot = s >= 80 ? 'bg-emerald-400' : s >= 50 ? 'bg-amber-400' : 'bg-red-400';
                    return (
                      <button
                        key={client.userId}
                        onClick={() => setSelectedClientId(client.userId)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-surface-edge text-text-muted hover:border-primary/40 hover:text-white'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isSelected ? 'bg-primary text-[#0a0d0e]' : 'bg-surface text-text-muted'
                        }`}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        {client.name}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const active = clients.find(c => c.userId === selectedClientId);
                  if (!active) return null;
                  const s = active.adherenceScore;
                  return (
                    <p className="text-xs text-text-disabled mt-3">
                      Viewing: <span className="text-white font-semibold">{active.name}</span>
                      {' · '}
                      <span className={s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400'}>
                        {s}% weekly adherence
                      </span>
                    </p>
                  );
                })()}
              </div>


            <div key={selectedClientId} className="grid grid-cols-1 lg:grid-cols-12 gap-8">


            {/* Col 1: Client roster + biometrics */}
            <div className="lg:col-span-3 space-y-5">
              <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider">My Roster</h3>
                  <button
                    onClick={handleMockAddClient}
                    disabled={mockAddClientLoading}
                    title="Add a mock test trainee"
                    className="text-[10px] font-black text-primary border border-primary/30 rounded-full px-2.5 py-1 hover:bg-primary/10 transition-all disabled:opacity-40"
                  >
                    {mockAddClientLoading ? '…' : '＋ Add'}
                  </button>
                </div>
                <div className="space-y-2">
                  {clients.map(client => {
                    const isSelected = client.userId === selectedClientId;
                    const score = client.adherenceScore;
                    const badge = score >= 80 ? { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Excellent' }
                      : score >= 50 ? { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Check In' }
                      : { bg: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'At Risk' };

                    return (
                      <button
                        key={client.userId}
                        onClick={() => setSelectedClientId(client.userId)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          isSelected ? 'border-primary/50 bg-primary/5' : 'border-surface-edge hover:border-surface-edge/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                              isSelected ? 'bg-primary text-[#0a0d0e]' : 'bg-primary/20 text-primary'
                            }`}>
                              {client.name.charAt(0)}
                            </div>
                            <span className="font-bold text-sm text-white">{client.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${badge.bg}`}>{badge.label}</span>
                        </div>
                        <div className="mt-2 pl-10">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-surface-edge rounded-full h-1.5">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-[10px] text-text-muted">{score}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client biometrics */}
              {selectedClientId && (() => {
                const client = clients.find(c => c.userId === selectedClientId);
                if (!client?.biometrics) return null;
                return (
                  <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-5 space-y-5">
                    <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider">Nutrition Targets</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Adjust Daily Calories</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tempCalories}
                            onChange={e => setTempCalories(Number(e.target.value))}
                            className="flex-1 bg-surface border border-surface-edge rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                          />
                          <button
                            onClick={handleUpdateCalories}
                            className="bg-primary text-surface font-bold px-3 py-2 rounded-xl hover:bg-primary-light transition-all text-sm whitespace-nowrap"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-surface-edge/60">
                        {[
                          { label: 'Protein', val: client.biometrics.protein, unit: 'g', color: 'text-blue-400' },
                          { label: 'Carbs', val: client.biometrics.carbs, unit: 'g', color: 'text-amber-400' },
                          { label: 'Fat', val: client.biometrics.fat, unit: 'g', color: 'text-rose-400' },
                        ].map(m => (
                          <div key={m.label} className="bg-surface rounded-xl p-2">
                            <p className={`text-[10px] font-bold uppercase ${m.color}`}>{m.label}</p>
                            <p className="text-sm font-black text-white mt-0.5">{m.val}{m.unit}</p>
                          </div>
                        ))}
                      </div>
                      {/* Weight history */}
                      {(() => {
                        const wLogs = client.weightLogs;
                        if (!wLogs?.length) return null;
                        return (
                          <div className="pt-3 border-t border-surface-edge/60">
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Weight History</p>
                            <div className="space-y-1.5">
                              {wLogs.slice(0, 5).map((log, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-text-muted">{log.date}</span>
                                  <span className="font-bold text-white">{log.weight} kg</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Col 2: Plan Assigner */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6">
                <h3 className="font-bold mb-5 flex items-center gap-2">
                  <span className="text-primary">📋</span> Assign Custom Plan
                </h3>
                <form onSubmit={handleAssignPlan} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Target Date</label>
                    <input
                      type="date"
                      value={assignDate}
                      onChange={e => setAssignDate(e.target.value)}
                      className="w-full bg-surface border border-surface-edge rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Fitness Routine</label>
                    <textarea
                      value={workoutInput}
                      onChange={e => setWorkoutInput(e.target.value)}
                      placeholder={'e.g. Squats 3x5 @ 100kg\nBench Press 3x5 @ 80kg\nPullups 3xMax'}
                      rows={4}
                      className="w-full bg-surface border border-surface-edge rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-disabled focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Meal Instructions</label>
                    <textarea
                      value={mealInput}
                      onChange={e => setMealInput(e.target.value)}
                      placeholder="e.g. Aim for 150g protein. Keep carbs high pre-workout."
                      rows={3}
                      className="w-full bg-surface border border-surface-edge rounded-xl px-3 py-2.5 text-sm text-white placeholder-text-disabled focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="save-tpl"
                      checked={saveAsTemplate}
                      onChange={e => setSaveAsTemplate(e.target.checked)}
                      className="accent-primary"
                    />
                    <label htmlFor="save-tpl" className="text-xs text-text-muted cursor-pointer select-none">Save as reusable template</label>
                  </div>
                  <button
                    type="submit"
                    disabled={assignLoading || (!workoutInput.trim() && !mealInput.trim())}
                    className="w-full bg-primary text-surface font-bold py-3 rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assignLoading && <Spinner />}
                    {assignLoading ? 'Assigning...' : '→ Assign to Trainee Calendar'}
                  </button>
                </form>
              </div>

              {/* Saved templates */}
              {templates.length > 0 && (
                <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-5">
                  <h3 className="font-bold text-sm mb-4">📁 Saved Templates</h3>
                  <div className="space-y-2">
                    {templates.map(tpl => (
                      <div key={tpl.id} className="flex items-center justify-between gap-3 bg-surface rounded-xl px-3 py-2.5 border border-surface-edge">
                        <p className="text-xs text-white truncate flex-1">{tpl.workout || tpl.meal}</p>
                        <button
                          onClick={() => { setWorkoutInput(tpl.workout); setMealInput(tpl.meal); }}
                          className="text-xs text-primary font-bold hover:underline shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned plans list */}
              {clientPlans.length > 0 && (
                <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-5">
                  <h3 className="font-bold text-sm mb-4">📅 Assigned Plans</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {clientPlans.map(plan => (
                      <div key={plan.id} className="bg-surface border border-surface-edge rounded-xl px-3 py-2.5">
                        <p className="text-xs font-bold text-primary">{formatDate(plan.date)}</p>
                        {plan.workout && <p className="text-xs text-text-muted mt-0.5 truncate">🏋️ {plan.workout}</p>}
                        {plan.mealInstructions && <p className="text-xs text-text-muted truncate">🥗 {plan.mealInstructions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Col 3: Coach Chat + Video Feedback */}
            <div className="lg:col-span-5 bg-[#1e1f26] border border-surface-edge rounded-3xl flex flex-col overflow-hidden" style={{ height: '680px' }}>
              <div className="p-5 border-b border-surface-edge/60">
                <h4 className="font-bold">Client Chat</h4>
                <p className="text-text-muted text-xs mt-0.5">
                  {clients.find(c => c.userId === selectedClientId)?.name ?? 'Select a client'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {clientMessages.length === 0 ? (
                  <EmptyState icon="💬" title="No messages yet" desc="Send your client their first message!" />
                ) : (
                  clientMessages.map(msg => (
                    <ChatBubble
                      key={msg.id}
                      msg={msg}
                      meId={meId}
                      onAnalyze={setActiveVideoMsg}
                    />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-surface-edge/60 bg-[#16171e]">
                <form onSubmit={handleCoachSend} className="flex gap-2">
                  <input
                    type="text"
                    value={coachInput}
                    onChange={e => setCoachInput(e.target.value)}
                    placeholder="Send feedback to client..."
                    className="flex-1 bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-sm placeholder-text-disabled focus:outline-none focus:border-primary transition-colors"
                  />
                  <button type="submit" className="bg-primary text-surface font-bold px-4 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm">
                    Reply
                  </button>
                </form>
              </div>
            </div>

          </div>

          </div>
        )
      )}


      {/* ── CONFLICT MODAL ─────────────────────────────────────────────────── */}
      {showConflict && pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConflict(false)} />
          <div className="relative bg-[#1e1f26] border border-surface-edge rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl font-bold mb-2">⚠️ Schedule Conflict</h4>
            <p className="text-text-muted text-sm mb-6">A plan already exists for <span className="text-white font-semibold">{assignDate}</span>. How would you like to resolve this?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setPendingPlan(null); setShowConflict(false); }} className="w-full bg-surface border border-surface-edge py-2.5 rounded-xl text-sm font-bold hover:border-primary transition-all">Cancel</button>
              <button onClick={() => savePlan(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all">➕ Append to Existing Plan</button>
              <button onClick={() => savePlan(false)} className="w-full bg-red-700 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all">🗑 Overwrite Existing Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRAINEE VIDEO UPLOAD MODAL ────────────────────────────────────── */}
      {showTrimmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !uploading && setShowTrimmer(false)} />
          <div className="relative bg-[#1e1f26] border border-surface-edge rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl font-bold mb-2">📹 Upload Form Check</h4>
            <p className="text-text-muted text-sm mb-6">Select a real video file of your workout for your coach to analyze.</p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-surface-edge hover:border-primary/50 rounded-2xl py-8 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-white transition-all mb-6"
              >
                <span className="text-3xl">📁</span>
                <span className="font-bold text-sm">Choose Video File</span>
                <span className="text-xs opacity-60">MP4, MOV, or WEBM</span>
              </button>
            ) : (
              <div className="bg-[#16171e] border border-surface-edge rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-white font-bold text-sm truncate">{selectedFile.name}</p>
                    <p className="text-text-muted text-xs">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {videoDurationSec}s</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                    className="text-text-muted hover:text-white text-xs font-bold"
                  >
                    Change
                  </button>
                </div>

                {uploading && (
                  <div className="space-y-1.5 pt-2 border-t border-surface-edge/60">
                    <div className="flex justify-between text-xs font-bold text-primary">
                      <span>Uploading to Cloudinary...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[#1e1f26] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {trimmerType === 'LARGE' && (
              <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4 mb-5">
                <p className="text-amber-400 text-xs font-bold mb-1">⚠️ Video exceeds 60s limit</p>
                <p className="text-text-muted text-xs">The file is {videoDurationSec}s long. The coach might ask you to keep clips shorter for analysis.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={uploading}
                onClick={() => { setSelectedFile(null); setShowTrimmer(false); }}
                className="flex-1 bg-surface border border-surface-edge py-2.5 rounded-xl text-sm font-bold hover:border-primary transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVideoUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 bg-primary text-surface font-black py-2.5 rounded-xl text-sm hover:bg-primary-light transition-all disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : '📤 Send to Coach'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO FORM-CHECK REVIEW MODAL (Coach) ─────────────────────────── */}
      {activeVideoMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveVideoMsg(null)} />
          <div className="relative bg-[#1e1f26] border border-surface-edge rounded-3xl shadow-2xl overflow-hidden w-full max-w-3xl flex flex-col md:flex-row" style={{ maxHeight: '90vh' }}>
            {/* Video player */}
            <div className="flex-1 bg-black flex flex-col">
              <video src={activeVideoMsg.mediaUrl ?? ''} controls className="w-full max-h-64 md:max-h-full object-contain" />
              <div className="p-4 bg-black/60 border-t border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-bold mb-2">Feedback Timeline Pins</p>
                <div className="flex flex-wrap gap-2">
                  {activeVideoMsg.feedbackNotes.length === 0 ? (
                    <span className="text-xs text-white/30 italic">No pins yet — add your first note →</span>
                  ) : (
                    activeVideoMsg.feedbackNotes.map(n => (
                      <span key={n.id} className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer" title={n.note}>
                        📌 {n.timestamp}s
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Feedback panel */}
            <div className="w-full md:w-80 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-surface-edge/60 flex items-center justify-between">
                <h4 className="font-bold">Form-Check Notes</h4>
                <button onClick={() => setActiveVideoMsg(null)} className="text-text-muted hover:text-white">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {activeVideoMsg.feedbackNotes.map(n => (
                  <div key={n.id} className="bg-surface border border-surface-edge rounded-xl px-3 py-2.5 text-xs">
                    <span className="font-bold text-blue-400">At {n.timestamp}s:</span>
                    <p className="text-text-muted mt-0.5 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddFeedback} className="p-4 border-t border-surface-edge/60 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-text-muted uppercase tracking-wider whitespace-nowrap">At (sec)</label>
                  <input
                    type="number"
                    min={0}
                    max={activeVideoMsg.videoDuration ?? 60}
                    value={videoTimestamp}
                    onChange={e => setVideoTimestamp(Number(e.target.value))}
                    className="w-20 bg-surface border border-surface-edge rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <textarea
                  value={feedbackNote}
                  onChange={e => setFeedbackNote(e.target.value)}
                  placeholder="e.g. Keep your back straighter at the bottom. Good depth!"
                  rows={3}
                  className="w-full bg-surface border border-surface-edge rounded-xl px-3 py-2.5 text-xs text-white placeholder-text-disabled focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={feedbackLoading || !feedbackNote.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {feedbackLoading && <Spinner />}
                  {feedbackLoading ? 'Saving...' : '📌 Pin Feedback Note'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MOCK SUBSCRIBE PICKER ─────────────────────────────────────────── */}
      {showMockSubscribe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMockSubscribe(false)} />
          <div className="relative bg-[#1e1f26] border border-surface-edge rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h4 className="text-xl font-bold mb-1">🔧 Dev: Mock Subscribe</h4>
            <p className="text-text-muted text-sm mb-6">Pick a coach to instantly simulate a subscription without Stripe.</p>
            {allCoachesForPicker.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No coach profiles found in the database yet.<br/>Create one via <a href="/coaches/become" className="text-primary hover:underline">/coaches/become</a>.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {allCoachesForPicker.map(c => (
                  <button
                    key={c.userId}
                    onClick={() => setSelectedMockCoachId(c.userId)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
                      selectedMockCoachId === c.userId ? 'border-primary bg-primary/5' : 'border-surface-edge hover:border-primary/50'
                    }`}
                  >
                    <p className="font-bold text-sm text-white">{c.name}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowMockSubscribe(false)} className="flex-1 bg-surface border border-surface-edge py-2.5 rounded-xl text-sm font-bold hover:border-primary transition-all">Cancel</button>
              <button
                onClick={handleMockSubscribe}
                disabled={mockSubLoading || !selectedMockCoachId}
                className="flex-1 bg-primary text-surface font-bold py-2.5 rounded-xl text-sm hover:bg-primary-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {mockSubLoading && <Spinner />}
                Confirm Subscribe
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
