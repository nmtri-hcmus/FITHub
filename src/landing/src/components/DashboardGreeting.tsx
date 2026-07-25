import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import type { BiometricsResponse } from '../lib/api';
import { api } from '../lib/api';

const GOAL_DISPLAY: Record<string, string> = {
  LOSE_WEIGHT: '🔥 Cutting — Fat Loss',
  MAINTAIN: '⚖️ Maintaining — Body Recomp',
  BUILD_MUSCLE: '💪 Bulking — Muscle Gain',
};

interface StatTileProps {
  label: string;
  value: number;
  unit: string;
  color?: string;
}
const StatTile: React.FC<StatTileProps> = ({ label, value, unit, color = 'text-primary' }) => (
  <div className="flex flex-col items-center justify-center bg-surface rounded-2xl border border-surface-edge p-5 gap-1">
    <span className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</span>
    <span className="text-xs text-text-subtle uppercase tracking-wider font-semibold">{unit}</span>
    <span className="text-xs text-text-muted mt-1">{label}</span>
  </div>
);

const DashboardGreetingInner: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [biometrics, setBiometrics] = useState<BiometricsResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    setMounted(true);

    // First try the localStorage cache for instant render
    const cached = localStorage.getItem('fithub_biometrics');
    if (cached) {
      try {
        setBiometrics(JSON.parse(cached));
        setIsFetching(false);
        return;
      } catch {
        // ignore parse errors, fall through to API fetch
      }
    }

    // If no cache, fetch fresh from the API
    const token = localStorage.getItem('fithub_token');
    if (!token) {
      setIsFetching(false);
      return;
    }

    api.users.me()
      .then((profile) => {
        if (profile.biometrics) {
          setBiometrics(profile.biometrics);
          localStorage.setItem('fithub_biometrics', JSON.stringify(profile.biometrics));
        }
      })
      .catch(() => {
        // User might not have biometrics yet — that's OK
      })
      .finally(() => setIsFetching(false));
  }, []);

  if (!mounted || isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── EMPTY STATE (survey skipped or not yet done) ─────────────────────────────
  if (!biometrics) {
    return (
      <div className="bg-surface-alt rounded-[2rem] p-10 md:p-16 border border-surface-edge relative overflow-hidden flex flex-col items-center text-center shadow-2xl">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-20 h-20 bg-surface border border-surface-edge rounded-full flex items-center justify-center mb-8 relative z-10 shadow-lg">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Unlock Your AI Insights</h2>
        <p className="text-text-soft text-lg max-w-lg mb-10 relative z-10">
          Your dashboard is looking a little empty! Complete your biometric profile to generate your
          customized macro targets and activate your personal AI Chef.
        </p>

        <a
          href="/survey"
          className="inline-block bg-primary text-surface font-bold px-8 py-4 rounded-full relative z-10 hover:bg-primary-light hover:-translate-y-0.5 transition-all"
          style={{ boxShadow: '0 0 20px rgba(213,255,95,0.25)' }}
        >
          Complete Profile
        </a>
      </div>
    );
  }

  // ── FILLED STATE (biometrics loaded from real DB) ───────────────────────────
  const displayName = user?.displayName ?? 'Athlete';
  const goal = GOAL_DISPLAY[biometrics.goal] ?? biometrics.goal;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting Banner */}
      <div className="bg-[image:var(--background-image-gradient-forest)] rounded-[2rem] p-8 border border-surface-edge relative overflow-hidden shadow-xl">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-text-subtle text-sm font-medium mb-1">Welcome back,</p>
          <h2 className="text-3xl font-black text-white mb-3">{displayName} 👋</h2>
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
            {goal}
          </span>
        </div>
      </div>

      {/* Daily Macro Targets */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-subtle mb-4">Your Daily Macro Targets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Calories" value={biometrics.dailyCalories} unit="kcal"  color="text-primary" />
          <StatTile label="Protein"  value={biometrics.protein}       unit="g"     color="text-blue-400" />
          <StatTile label="Carbs"    value={biometrics.carbs}         unit="g"     color="text-yellow-400" />
          <StatTile label="Fat"      value={biometrics.fat}           unit="g"     color="text-orange-400" />
        </div>
      </div>

      {/* Biometric Summary */}
      <div className="bg-surface-alt rounded-2xl border border-surface-edge p-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-white">{biometrics.weight} kg</p>
          <p className="text-xs text-text-subtle mt-0.5">Body Weight</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{biometrics.height} cm</p>
          <p className="text-xs text-text-subtle mt-0.5">Height</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{biometrics.age} yrs</p>
          <p className="text-xs text-text-subtle mt-0.5">Age</p>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="border border-dashed border-surface-edge rounded-2xl p-6 text-center">
        <p className="text-text-subtle text-sm">
          🚀 <span className="font-semibold text-text-muted">Full dashboard coming soon</span> — meal logging, AI Chef, coach marketplace & more.
        </p>
        <a href="/survey" className="text-xs text-primary hover:underline mt-2 inline-block">
          Update my profile →
        </a>
      </div>
    </div>
  );
};

export const DashboardGreeting: React.FC = () => (
  <AuthProvider>
    <DashboardGreetingInner />
  </AuthProvider>
);
