import React, { useState, useEffect } from 'react';
import { api, type CoachProfile } from '../../lib/api';
import { CoachDetailModal } from '../CoachDetailModal';
import { motion, AnimatePresence } from 'framer-motion';

export const CoachesApp: React.FC = () => {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  // Biometrics logic
  const [hasBiometrics, setHasBiometrics] = useState<boolean | null>(null);

  // Filters
  const [goalFilter, setGoalFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(300);
  const [hasNoMatches, setHasNoMatches] = useState(false);

  useEffect(() => {
    // Check if user has biometrics for personalized matching
    const bioStr = localStorage.getItem('fithub_biometrics');
    if (bioStr && bioStr !== 'null') {
      const bio = JSON.parse(bioStr);
      setHasBiometrics(true);
      // Auto-set the goal filter to the user's goal
      if (bio.goal) setGoalFilter(bio.goal);
    } else {
      setHasBiometrics(false);
    }
  }, []);

  useEffect(() => {
    if (hasBiometrics === false) return; // Don't fetch if no biometrics
    
    setIsLoading(true);
    setHasNoMatches(false);
    
    api.coaches.getRecommendations({
      goal: goalFilter || undefined,
      maxPrice: maxPriceFilter < 300 ? maxPriceFilter : undefined
    }).then(results => {
      if (results.length === 0) {
        setHasNoMatches(true);
        // Fallback: fetch without filters
        return api.coaches.getRecommendations({});
      }
      return results;
    }).then(results => {
      // Sort by rating descending
      setCoaches(results.sort((a, b) => b.rating - a.rating));
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [goalFilter, maxPriceFilter, hasBiometrics]);

  if (hasBiometrics === false) {
    return (
      <div className="bg-surface-alt rounded-[2rem] p-10 md:p-16 border border-surface-edge relative overflow-hidden flex flex-col items-center text-center shadow-2xl">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="w-20 h-20 bg-surface border border-surface-edge rounded-full flex items-center justify-center mb-8 relative z-10 shadow-lg">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Complete Your Profile First</h2>
        <p className="text-text-soft text-lg max-w-lg mb-10 relative z-10">
          Our intelligent matchmaking algorithm requires your biometrics and fitness goals to recommend the perfect coaches for you.
        </p>
        <a href="/survey" className="inline-block bg-primary text-surface font-bold px-8 py-4 rounded-full relative z-10 hover:bg-primary-light hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(213,255,95,0.25)]">
          Complete Profile Survey
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="bg-surface border border-surface-edge rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-6 items-center shadow-lg">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Goal Specialization</label>
          <select 
            value={goalFilter} 
            onChange={e => setGoalFilter(e.target.value)}
            className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="">Any Goal</option>
            <option value="LOSE_WEIGHT">Weight Loss</option>
            <option value="BUILD_MUSCLE">Build Muscle</option>
            <option value="MAINTAIN">Maintenance & Athleticism</option>
          </select>
        </div>
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">Max Price</label>
            <span className="text-sm font-bold text-primary">{maxPriceFilter === 300 ? 'Any' : `$${maxPriceFilter}/mo`}</span>
          </div>
          <input 
            type="range" 
            min="50" max="300" step="10" 
            value={maxPriceFilter} 
            onChange={e => setMaxPriceFilter(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-surface-alt rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="w-full md:w-1/3 flex justify-end">
          <button 
            onClick={() => { setGoalFilter(''); setMaxPriceFilter(300); }}
            className="text-text-muted hover:text-white transition-colors font-medium text-sm border border-surface-edge rounded-lg px-4 py-2 hover:bg-surface-alt"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {hasNoMatches && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl mb-8 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p className="text-sm">We couldn't find an exact match for your strict constraints. Showing broader recommendations below.</p>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface-alt rounded-2xl h-80 animate-pulse border border-surface-edge" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches.map(coach => (
              <motion.div
                key={coach.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-surface border border-surface-edge rounded-2xl p-6 hover:border-primary/40 transition-colors shadow-xl group flex flex-col relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedCoachId(coach.id)}
              >
                {coach.rating >= 4.9 && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg z-10 shadow-lg">Top Rated</div>
                )}
                
                <div className="flex gap-4 mb-4 relative z-10">
                  <img src={coach.imageUrl} alt={coach.name} className="w-20 h-20 rounded-xl object-cover border-2 border-surface-edge group-hover:border-primary/50 transition-colors" />
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{coach.name}</h3>
                    <div className="text-xs font-bold text-primary tracking-widest mt-1 mb-2">{coach.specialization.replace('_', ' ')}</div>
                    <div className="flex items-center gap-1.5 bg-surface-alt w-fit px-2 py-0.5 rounded border border-surface-edge">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="text-xs font-bold text-white">{coach.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-text-muted mb-6 flex-1 line-clamp-3 leading-relaxed">{coach.bio}</p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-edge">
                  <div>
                    <span className="text-xs text-text-muted block mb-0.5 uppercase tracking-wider font-medium">Starting at</span>
                    <span className="text-xl font-black text-white">${coach.price}<span className="text-sm font-normal text-text-muted">/mo</span></span>
                  </div>
                  <button className="bg-surface-alt border border-surface-edge hover:border-primary text-white font-bold py-2 px-5 rounded-lg text-sm transition-all group-hover:bg-primary group-hover:text-surface">
                    View Profile
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {selectedCoachId && (
        <CoachDetailModal 
          coachId={selectedCoachId} 
          onClose={() => setSelectedCoachId(null)} 
        />
      )}
    </div>
  );
};
