import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { api, type DailyDashboard, type MealType } from '../lib/api';
import { MacroRing } from './MacroRing';
import { MacroProgressBar } from './MacroProgressBar';
import { MealSection } from './MealSection';

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const todayStr = () => new Date().toISOString().split('T')[0];

const toLocalDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

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
    (dashboard?.meals ?? []).filter(
      (m) => m.mealType === type
    );

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
