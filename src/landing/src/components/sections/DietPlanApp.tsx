import React, { useState } from 'react';
import { DietCalendar } from '../DietCalendar';
import { GroceryListModal } from '../GroceryListModal';
import { getISOWeek } from '../../lib/api';

// SVG icons (imported as strings via ?raw, inlined at build time)
import weeklyPlanSvg from '../../assets/weekly-plan.diet-plan.svg?raw';
import breakfastSvg from '../../assets/breakfast.svg?raw';
import lunchSvg from '../../assets/lunch.svg?raw';
import dinnerSvg from '../../assets/dinner.svg?raw';
import snackSvg from '../../assets/snack.svg?raw';

export const DietPlanApp: React.FC = () => {
  const [isGroceryListOpen, setIsGroceryListOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<string>(getISOWeek(new Date()));

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-surface-edge bg-surface-alt p-8">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary [&>svg]:w-5 [&>svg]:h-5"
                dangerouslySetInnerHTML={{ __html: weeklyPlanSvg }}
              />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Diet Calendar</span>
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">Weekly Meal Planner</h1>
            <p className="text-text-muted mt-2 text-sm max-w-md">
              Schedule your meals for the week, browse community recipes, and generate a grocery list — all in one place.
            </p>

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[11px] font-semibold text-text-subtle bg-surface border border-surface-edge px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="inline-flex w-3.5 h-3.5 text-amber-400 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: breakfastSvg }} />
                Breakfast ·{' '}
                <span className="inline-flex w-3.5 h-3.5 text-amber-400 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: lunchSvg }} />
                Lunch ·{' '}
                <span className="inline-flex w-3.5 h-3.5 text-amber-400 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: dinnerSvg }} />
                Dinner ·{' '}
                <span className="inline-flex w-3.5 h-3.5 text-amber-400 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: snackSvg }} />
                Snack
              </span>
              <span className="text-[11px] font-semibold text-text-subtle bg-surface border border-surface-edge px-3 py-1 rounded-full">
                Week: {currentWeek}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* Link to Recipes page */}
            <a
              href="/recipes"
              className="bg-surface text-text-muted hover:text-white border border-surface-edge font-semibold py-3 px-5 rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Browse Recipes
            </a>

            {/* Grocery list button */}
            <button
              onClick={() => setIsGroceryListOpen(true)}
              className="bg-primary text-gray-900 hover:bg-primary-light font-bold py-3 px-5 rounded-xl transition-colors flex items-center gap-2 text-sm border border-primary-dark/15"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Grocery List
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Panel */}
      <div className="bg-surface-alt rounded-[2rem] border border-surface-edge p-4 sm:p-6">
        <DietCalendar
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
        />
      </div>

      <GroceryListModal
        isOpen={isGroceryListOpen}
        week={currentWeek}
        onClose={() => setIsGroceryListOpen(false)}
      />
    </div>
  );
};
