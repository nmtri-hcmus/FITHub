import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { api, type DailyDashboard, type MealType } from '../lib/api';
import { MacroRing } from './MacroRing';
import { MacroProgressBar } from './MacroProgressBar';
import { MealSection } from './MealSection';

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const todayStr = () => toLocalDate(new Date());

const toLocalDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

// ── Over-target warning banner (UC-05 A1) ────────────────────────────────────
interface OverTargetWarningProps {
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  targets: { calories: number; protein: number; carbs: number; fat: number };
}

const OverTargetWarning: React.FC<OverTargetWarningProps> = ({ consumed, targets }) => {
  const overMacros: string[] = [];
  if (consumed.calories > targets.calories) overMacros.push(`calories (+${Math.round(consumed.calories - targets.calories)} kcal)`);
  if (consumed.protein  > targets.protein)  overMacros.push(`protein (+${(consumed.protein - targets.protein).toFixed(1)}g)`);
  if (consumed.carbs    > targets.carbs)    overMacros.push(`carbs (+${(consumed.carbs - targets.carbs).toFixed(1)}g)`);
  if (consumed.fat      > targets.fat)      overMacros.push(`fat (+${(consumed.fat - targets.fat).toFixed(1)}g)`);

  if (overMacros.length === 0) return null;

  return (
    <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/30 rounded-2xl p-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-lg">⚠️</div>
      <div>
        <p className="text-red-300 font-bold text-sm">Daily target exceeded</p>
        <p className="text-red-400/80 text-xs mt-0.5">
          You've gone over your {overMacros.join(', ')} target{overMacros.length > 1 ? 's' : ''} for today.
          Consider lighter options for your remaining meals.
        </p>
      </div>
    </div>
  );
};

// ── Empty state for a date with no meals (UC-05 A3) ───────────────────────────
interface EmptyDayStateProps {
  isToday: boolean;
}

const EmptyDayState: React.FC<EmptyDayStateProps> = ({ isToday }) => (
  <div className="flex flex-col items-center text-center py-10 px-6">
    <div className="w-20 h-20 rounded-full bg-surface-alt border border-surface-edge flex items-center justify-center text-4xl mb-5">🍽️</div>
    <h3 className="text-white font-bold text-lg mb-1">
      {isToday ? 'Nothing logged yet today' : 'No meals logged this day'}
    </h3>
    <p className="text-text-muted text-sm max-w-xs">
      {isToday
        ? 'Tap "+ Add" on any meal section below to start tracking your nutrition.'
        : 'No food entries were recorded for this date.'}
    </p>
  </div>
);

const NutritionTrackerInner: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dashboard, setDashboard] = useState<DailyDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.meals.getDashboard(date);
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load nutrition data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate, fetchDashboard]);

  const handleUpdate = useCallback(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate, fetchDashboard]);

  const consumed = dashboard?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const targets = dashboard?.targets ?? null;

  const getMealsForType = (type: MealType) =>
    (dashboard?.meals ?? []).filter((m) => m.mealType === type);

  const totalMealsLogged = (dashboard?.meals ?? []).length;
  const isToday = selectedDate === todayStr();

  return (
    <div className="flex flex-col gap-6">

      {/* Date picker header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Nutrition Log</h2>
        <input
          type="date"
          value={selectedDate}
          max={todayStr()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface border border-surface-edge text-white text-sm rounded-xl px-3 py-2 focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={() => fetchDashboard(selectedDate)} className="text-primary text-sm mt-2 hover:underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* UC-05 A1 — Over-target warning */}
          {targets && (
            <OverTargetWarning consumed={consumed} targets={targets} />
          )}

          {/* Macro Summary Card */}
          <div className="bg-[image:var(--background-image-gradient-forest)] rounded-2xl border border-surface-edge p-6">
            {!targets ? (
              <div className="text-center py-4">
                <p className="text-text-muted text-sm">
                  Complete your{' '}
                  <a href="/survey" className="text-primary hover:underline font-semibold">
                    biometric profile
                  </a>{' '}
                  to see macro targets.
                </p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Calorie ring */}
                <div className="flex-shrink-0">
                  <MacroRing
                    consumed={Math.round(consumed.calories)}
                    target={targets.calories}
                  />
                </div>

                {/* Macro bars */}
                <div className="flex-1 w-full flex flex-col gap-4">
                  <MacroProgressBar
                    label="Protein"
                    consumed={consumed.protein}
                    target={targets.protein}
                    color="text-blue-400"
                    trackColor="bg-blue-400"
                  />
                  <MacroProgressBar
                    label="Carbs"
                    consumed={consumed.carbs}
                    target={targets.carbs}
                    color="text-yellow-400"
                    trackColor="bg-yellow-400"
                  />
                  <MacroProgressBar
                    label="Fat"
                    consumed={consumed.fat}
                    target={targets.fat}
                    color="text-orange-400"
                    trackColor="bg-orange-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* UC-05 A3 — Empty state */}
          {totalMealsLogged === 0 && (
            <EmptyDayState isToday={isToday} />
          )}

          {/* Meal sections */}
          <div className="flex flex-col gap-3">
            {MEAL_TYPES.map((type) => (
              <MealSection
                key={type}
                mealType={type}
                meals={getMealsForType(type)}
                date={selectedDate}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const NutritionTracker: React.FC = () => (
  <AuthProvider>
    <NutritionTrackerInner />
  </AuthProvider>
);
