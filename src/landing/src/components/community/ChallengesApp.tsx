import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { BackendChallenge } from '../../lib/api';

export const ChallengesApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'tracking' | 'leaderboards'>('challenges');
  const [challenges, setChallenges] = useState<BackendChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<BackendChallenge | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadChallenges = async () => {
    try {
      await api.community.syncChallenges().catch(console.error);
      const data = await api.community.getChallenges();
      if (data.length > 0) {
        setChallenges(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      await api.community.joinChallenge(id);
      alert('Joined challenge successfully!');
      setSelectedChallenge(null);
      loadChallenges(); // Reload to update participant count
    } catch (err: any) {
      alert(err.message || 'Failed to join challenge');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 mb-10">
        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Fitness Challenges</h1>
        <div className="flex items-center gap-6 border-b border-surface-edge">
          <button 
            onClick={() => setActiveTab('challenges')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${
              activeTab === 'challenges' ? 'text-white' : 'text-text-subtle hover:text-gray-300'
            }`}
          >
            ACTIVE CHALLENGES
            {activeTab === 'challenges' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('tracking')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${
              activeTab === 'tracking' ? 'text-white' : 'text-text-subtle hover:text-gray-300'
            }`}
          >
            MY PROGRESS
            {activeTab === 'tracking' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('leaderboards')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${
              activeTab === 'leaderboards' ? 'text-white' : 'text-text-subtle hover:text-gray-300'
            }`}
          >
            LEADERBOARDS
            {activeTab === 'leaderboards' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {activeTab === 'challenges' && (
        <div className="space-y-10 animate-fadeInUp">
          {/* Spotlight Banner */}
          {challenges.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-black text-white p-8 md:p-12 shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent z-10"></div>
              <img 
                src={`https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop`} 
                alt="Challenge" 
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
              />
              
              <div className="relative z-20 max-w-xl">
                <div className="inline-flex items-center gap-2 bg-surface/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                  đŸ”¥ Monthly Spotlight
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">{challenges[0].title}</h2>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed line-clamp-3">
                  {challenges[0].description}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">â³</span>
                    <div>
                      <div className="text-xs text-text-subtle uppercase font-bold">Time Left</div>
                      <div className="text-sm font-bold">14d 08h 22m</div>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-surface/20 hidden md:block"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">đŸ‘¥</span>
                    <div>
                      <div className="text-xs text-text-subtle uppercase font-bold">Participants</div>
                      <div className="text-sm font-bold">{challenges[0]._count?.participants ?? challenges[0].participants?.length ?? 0}</div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setSelectedChallenge(challenges[0])} className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  View Challenge
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {challenges.length > 1 && (
            <div>
              <h3 className="text-xl font-black text-white mb-6">More Challenges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.slice(1).map(c => (
                  <div key={c.id} onClick={() => setSelectedChallenge(c)} className="bg-surface border border-surface-edge rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col">
                    <div className="h-32 bg-surface-edge relative">
                      <img src={`https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop&sig=${c.id}`} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur text-white text-[10px] font-black uppercase px-2 py-1 rounded-md">
                        Endurance
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-bold text-lg mb-2 text-white line-clamp-1">{c.title}</h4>
                      <p className="text-sm text-text-muted line-clamp-2 mb-4 flex-1">{c.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                          <span className="text-emerald-500">đŸ‘¥</span> {c._count?.participants ?? c.participants?.length ?? 0}
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-600 bg-emerald-500/10">
                          {c.participants && c.participants.length > 0 ? Math.min(100, Math.round((c.participants[0].progress / 30) * 100)) + '%' : '0%'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tracking' && (
        <TrackingView challenges={challenges.filter(c => c.participants && c.participants.length > 0)} onSelectChallenge={setSelectedChallenge} />
      )}

      {activeTab === 'leaderboards' && (
        <LeaderboardView />
      )}

      {selectedChallenge && (
        <ChallengeSlideboard 
          challenge={selectedChallenge} 
          onClose={() => setSelectedChallenge(null)} 
          joining={joiningId === selectedChallenge.id}
          onJoin={() => handleJoin(selectedChallenge.id)}
        />
      )}
    </div>
  );
};

const TrackingView: React.FC<{ challenges: BackendChallenge[], onSelectChallenge: (c: BackendChallenge) => void }> = ({ challenges, onSelectChallenge }) => {
  if (challenges.length === 0) {
    return (
      <div className="bg-surface border border-surface-edge rounded-3xl p-12 text-center shadow-sm">
        <span className="text-6xl mb-4 block">đŸ¯</span>
        <h3 className="text-2xl font-black text-white mb-2">No Active Challenges</h3>
        <p className="text-text-muted mb-6">Join a challenge from the Active Challenges tab to start tracking your progress here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {challenges.map(c => {
        const progress = c.participants?.[0]?.progress || 0;
        const target = 30; // Assuming 30 days for these challenges
        const percentage = Math.min(100, Math.round((progress / target) * 100));
        
        return (
          <div key={c.id} onClick={() => onSelectChallenge(c)} className="bg-surface border border-surface-edge rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-xl text-white mb-1">{c.title}</h4>
                <p className="text-sm text-text-muted line-clamp-1">{c.description}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wide">
                Enrolled
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-text-muted">Progress</span>
                <span className="text-emerald-600">{progress} / {target} days ({percentage}%)</span>
              </div>
              <div className="w-full h-3 bg-surface-edge rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeaderboardView: React.FC = () => {
  const leaders = [
    { rank: 1, name: 'Sarah J.', score: 12400, avatar: 'Sarah' },
    { rank: 2, name: 'Mike T.', score: 11950, avatar: 'Mike' },
    { rank: 3, name: 'Elena R.', score: 11800, avatar: 'Elena' },
    { rank: 4, name: 'David L.', score: 10500, avatar: 'David' },
    { rank: 5, name: 'Chris P.', score: 9800, avatar: 'Chris' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Podium */}
      <div className="flex items-end justify-center gap-2 sm:gap-6 mb-12 h-64 mt-10">
        {/* 2nd Place */}
        <div className="flex flex-col items-center animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="w-16 h-16 rounded-full border-4 border-gray-700 bg-surface-edge overflow-hidden mb-2 relative">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leaders[1].avatar}`} />
            <div className="absolute -bottom-1 -right-1 bg-gray-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md">2</div>
          </div>
          <span className="text-sm font-bold text-gray-200">{leaders[1].name}</span>
          <span className="text-xs text-text-muted font-medium mb-3">{leaders[1].score} pts</span>
          <div className="w-24 sm:w-32 h-32 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-xl border-t-4 border-gray-700 flex items-center justify-center text-text-subtle font-black text-3xl opacity-50">2</div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center animate-fadeInUp z-10">
          <div className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-yellow-50 overflow-hidden mb-2 relative shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leaders[0].avatar}`} />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md">1</div>
          </div>
          <span className="text-base font-black text-white">{leaders[0].name}</span>
          <span className="text-xs text-yellow-600 font-bold mb-3">{leaders[0].score} pts</span>
          <div className="w-28 sm:w-36 h-40 bg-gradient-to-t from-yellow-100 to-yellow-50 rounded-t-xl border-t-4 border-yellow-400 flex items-center justify-center text-yellow-300 font-black text-4xl opacity-50">1</div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 bg-emerald-500/10 overflow-hidden mb-2 relative">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leaders[2].avatar}`} />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md">3</div>
          </div>
          <span className="text-sm font-bold text-gray-200">{leaders[2].name}</span>
          <span className="text-xs text-emerald-600 font-medium mb-3">{leaders[2].score} pts</span>
          <div className="w-24 sm:w-32 h-24 bg-gradient-to-t from-emerald-100 to-emerald-50 rounded-t-xl border-t-4 border-emerald-500 flex items-center justify-center text-emerald-300 font-black text-3xl opacity-50">3</div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-surface border border-surface-edge rounded-2xl overflow-hidden shadow-sm relative pb-16">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-alt border-b border-surface-edge text-xs font-black uppercase text-text-muted tracking-wider">
              <th className="p-4 w-16 text-center">Rank</th>
              <th className="p-4">Participant</th>
              <th className="p-4 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-edge">
            {leaders.map((user, idx) => (
              <tr key={idx} className="hover:bg-surface-alt transition-colors">
                <td className="p-4 text-center font-bold text-text-subtle">{user.rank}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} /></div>
                    <span className="font-bold text-white">{user.name}</span>
                  </div>
                </td>
                <td className="p-4 text-right font-bold text-emerald-600">{user.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pinned Bottom Row (Current User) */}
        <div className="absolute bottom-0 left-0 w-full bg-black text-white border-t border-gray-800 p-4 flex items-center justify-between shadow-[0_-4px_15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-4">
            <span className="w-8 text-center font-black text-emerald-400">142</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Me`} /></div>
              <span className="font-bold">You</span>
            </div>
          </div>
          <span className="font-bold text-emerald-400">2,450</span>
        </div>
      </div>
    </div>
  );
};

const ChallengeSlideboard: React.FC<{ challenge: BackendChallenge, onClose: () => void, joining: boolean, onJoin: () => void }> = ({ challenge, onClose, joining, onJoin }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col animate-fadeInRight overflow-hidden">
        <div className="relative h-48 bg-gray-800 shrink-0">
          <img src={`https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop&sig=${challenge.id}`} className="w-full h-full object-cover" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black transition-colors">&times;</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wide mb-3">
            Active Challenge
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{challenge.title}</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-6">{challenge.description}</p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-surface-alt rounded-xl border border-surface-edge">
              <span className="text-2xl">đŸ“…</span>
              <div>
                <p className="text-xs font-bold text-text-subtle uppercase">Timeline</p>
                <p className="text-sm font-semibold text-white">Ends in 15 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-surface-alt rounded-xl border border-surface-edge">
              <span className="text-2xl">đŸ¯</span>
              <div>
                <p className="text-xs font-bold text-text-subtle uppercase">Goal</p>
                <p className="text-sm font-semibold text-white">Complete 30 check-ins</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-surface-alt rounded-xl border border-surface-edge">
              <span className="text-2xl">đŸ†</span>
              <div>
                <p className="text-xs font-bold text-text-subtle uppercase">Reward</p>
                <p className="text-sm font-semibold text-white">Consistency Master Badge</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-white mb-2">Rules</h3>
            <ul className="text-sm text-text-muted space-y-2 list-disc pl-4">
              <li>Log at least one meal per day.</li>
              <li>Complete your daily step goal.</li>
              <li>Missed days reset your streak.</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-surface-edge bg-surface shrink-0">
          <button 
            disabled={joining || (challenge.participants && challenge.participants.length > 0)} 
            onClick={onJoin} 
            className={`w-full py-3.5 rounded-xl font-black uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50 ${
              (challenge.participants && challenge.participants.length > 0)
                ? 'bg-gray-800 text-text-muted shadow-none'
                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {joining ? 'Joining...' : (challenge.participants && challenge.participants.length > 0) ? 'Joined' : 'Join Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
};






