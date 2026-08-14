import React, { useState, useEffect, useCallback } from 'react';
import { api, type BackendCoachProfile } from '../../lib/api';

// Helper: compute average rating from reviews
function avgRating(coach: BackendCoachProfile): number {
  const reviews = coach.user?.reviewsReceived;
  if (!reviews || reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

// Helper: format specialty label
function specialtyLabel(specialty: string): string {
  const lower = specialty.toLowerCase();
  if (lower.includes('weight') || lower.includes('lose') || lower.includes('fat')) return 'Weight Loss';
  if (lower.includes('muscle') || lower.includes('build') || lower.includes('strength')) return 'Muscle Building';
  if (lower.includes('maintain') || lower.includes('performance')) return 'Fitness Maintenance';
  return specialty;
}

// Skeleton card for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-[#1e1f26] border border-surface-edge rounded-3xl p-6 h-[400px] animate-pulse flex flex-col justify-between">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-surface-edge rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-surface-edge rounded w-2/3" />
        <div className="h-3 bg-surface-edge rounded w-1/3" />
      </div>
    </div>
    <div className="space-y-3 flex-1 mt-6">
      <div className="h-3 bg-surface-edge rounded w-full" />
      <div className="h-3 bg-surface-edge rounded w-5/6" />
      <div className="h-3 bg-surface-edge rounded w-4/6" />
    </div>
    <div className="h-10 bg-surface-edge rounded-xl w-full mt-6" />
  </div>
);

// Individual coach card
const CoachCard: React.FC<{ coach: BackendCoachProfile }> = ({ coach }) => {
  const rating = avgRating(coach);
  const reviewCount = coach.user?.reviewsReceived?.length ?? 0;
  const label = specialtyLabel(coach.specialty);

  return (
    <div className="bg-[#1e1f26] border border-surface-edge hover:border-primary/40 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300 pointer-events-none" />

      <div>
        {/* Avatar + Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-2xl font-black text-primary shrink-0">
            {coach.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors leading-tight">
              {coach.user.name}
            </h3>
            <span className="inline-block bg-primary/10 text-primary text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full mt-1">
              {label}
            </span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-text-subtle text-sm mt-5 line-clamp-3 leading-relaxed">
          {coach.bio || `${coach.user.name} is a verified personal trainer specializing in ${label.toLowerCase()}.`}
        </p>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 mt-4">
            <span className="text-primary text-xs">
              {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
            </span>
            <span className="text-text-subtle text-xs">{rating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div>
        <div className="mt-6 pt-5 border-t border-surface-edge/60 flex items-center justify-between">
          <div>
            <p className="text-text-muted text-[10px] uppercase tracking-wider">Monthly</p>
            <p className="text-white font-extrabold text-xl">
              ${coach.hourlyRate}
              <span className="text-text-subtle font-normal text-xs">/mo</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-[10px] uppercase tracking-wider">Status</p>
            {coach.isVerified ? (
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">✓ Verified</span>
            ) : (
              <span className="text-amber-400 text-xs font-bold">Pending</span>
            )}
          </div>
        </div>

        <a
          href={`/coaches/${coach.userId}`}
          className="block w-full text-center py-3 mt-4 rounded-xl font-bold text-sm text-white bg-surface border border-surface-edge group-hover:bg-primary group-hover:text-surface group-hover:border-primary transition-all duration-300"
        >
          View Profile &amp; Book
        </a>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const CoachMarketplaceApp: React.FC = () => {
  const [coaches, setCoaches] = useState<BackendCoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [maxRate, setMaxRate] = useState(300);

  // Matchmaking banner
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  // Read user data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fithub_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.biometrics?.goal) setUserGoal(u.biometrics.goal);
        if (u.role === 'COACH') setIsCoach(true);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchCoaches = useCallback(async (useMatchmaking = false) => {
    setLoading(true);
    setError(null);
    try {
      let data: BackendCoachProfile[];
      if (useMatchmaking && userGoal) {
        data = await api.coaches.getRecommendations(userGoal);
      } else {
        data = await api.coaches.search({
          specialty: specialtyQuery || undefined,
          maxRate: maxRate < 300 ? maxRate : undefined,
        });
      }
      setCoaches(data);
      setMatchmakingActive(useMatchmaking);
    } catch (err: any) {
      setError(err.message || 'Failed to load coaches.');
    } finally {
      setLoading(false);
    }
  }, [specialtyQuery, maxRate, userGoal]);

  // Initial load
  useEffect(() => {
    fetchCoaches(false);
  }, []);

  // Re-fetch when filters change (debounced)
  useEffect(() => {
    if (matchmakingActive) return; // Don't override matchmaking with filter changes
    const t = setTimeout(() => fetchCoaches(false), 400);
    return () => clearTimeout(t);
  }, [specialtyQuery, maxRate]);

  const goalLabel = userGoal === 'LOSE_WEIGHT' ? 'Weight Loss' : userGoal === 'BUILD_MUSCLE' ? 'Muscle Building' : 'Fitness Maintenance';

  return (
    <div className="min-h-screen bg-[#13141c] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Find Your <span className="text-primary">Perfect Coach</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-text-subtle">
            Browse certified, verified trainers — book a free 15-minute consultation before committing to a plan.
          </p>
        </div>

        {/* Matchmaking Banner */}
        {userGoal && !matchmakingActive && (
          <div className="mb-8 bg-primary/10 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                🌟 Personalized Recommendations
              </h3>
              <p className="text-text-subtle text-sm mt-1">
                Based on your onboarding profile, we can instantly surface coaches who specialize in{' '}
                <span className="font-semibold text-white">{goalLabel}</span>.
              </p>
            </div>
            <button
              onClick={() => fetchCoaches(true)}
              className="bg-primary text-surface font-bold px-5 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm shrink-0"
            >
              Show My Matches
            </button>
          </div>
        )}

        {/* Active Matchmaking Banner */}
        {matchmakingActive && (
          <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
            <p className="text-emerald-400 text-sm font-semibold">
              ✓ Showing coaches matched to your <span className="text-white">{goalLabel}</span> goal
            </p>
            <button
              onClick={() => { setMatchmakingActive(false); fetchCoaches(false); }}
              className="text-text-muted hover:text-white text-xs font-semibold transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        {!matchmakingActive && (
          <div className="bg-[#1e1f26] border border-surface-edge rounded-2xl p-6 mb-10 flex flex-col md:flex-row gap-6 items-end justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full md:max-w-2xl">

              {/* Specialty Search */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Specialty / Keyword
                </label>
                <input
                  type="text"
                  placeholder="e.g. weight loss, muscle, yoga..."
                  value={specialtyQuery}
                  onChange={(e) => setSpecialtyQuery(e.target.value)}
                  className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-3 text-white placeholder-text-disabled focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Max Rate Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Max Monthly Budget
                  </label>
                  <span className="text-primary text-xs font-bold">${maxRate === 300 ? 'Any' : `${maxRate}/mo`}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={maxRate}
                  onChange={(e) => setMaxRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-surface-edge rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Clear filters */}
            {(specialtyQuery || maxRate < 300) && (
              <button
                onClick={() => { setSpecialtyQuery(''); setMaxRate(300); }}
                className="text-text-muted hover:text-white transition-colors text-sm font-semibold shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Become a Coach CTA for coach users */}
        {isCoach && (
          <div className="mb-8 bg-[#1e1f26] border border-surface-edge rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">You have a Coach account</p>
              <p className="text-text-muted text-xs mt-0.5">Manage your coach profile and client roster from your dashboard.</p>
            </div>
            <a
              href="/dashboard"
              className="bg-primary text-surface font-bold px-5 py-2 rounded-xl hover:bg-primary-light transition-all text-sm shrink-0"
            >
              My Dashboard
            </a>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-2xl p-5 text-red-400 text-sm text-center">
            {error} —{' '}
            <button onClick={() => fetchCoaches(matchmakingActive)} className="underline hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {/* Coach Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-20 bg-[#1e1f26] border border-surface-edge rounded-3xl">
            <span className="text-5xl">🏋️</span>
            <h3 className="text-lg font-bold text-white mt-4">No coaches found</h3>
            <p className="text-text-subtle text-sm mt-2 max-w-md mx-auto">
              {matchmakingActive
                ? 'No coaches are currently verified for your goal. Try browsing all coaches.'
                : 'Try adjusting your filters or search to find matching trainers.'}
            </p>
            {matchmakingActive && (
              <button
                onClick={() => { setMatchmakingActive(false); fetchCoaches(false); }}
                className="mt-5 bg-primary text-surface font-bold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm"
              >
                Browse All Coaches
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-text-muted text-sm mb-6">
              {coaches.length} certified trainer{coaches.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
