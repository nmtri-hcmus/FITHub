import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type MealLog, type MealType } from '../lib/api';
import { FoodSearchModal } from './FoodSearchModal';

import breakfastSvg from '../assets/breakfast.svg?raw';
import lunchSvg from '../assets/lunch.svg?raw';
import dinnerSvg from '../assets/dinner.svg?raw';
import snackSvg from '../assets/snack.svg?raw';

interface MealSectionProps {
  mealType: MealType;
  meals: MealLog[];
  date: string;
  onUpdate: () => void;
}

const MEAL_ICONS: Record<MealType, string> = {
  BREAKFAST: breakfastSvg,
  LUNCH:     lunchSvg,
  DINNER:    dinnerSvg,
  SNACK:     snackSvg,
};

const MEAL_COLORS: Record<MealType, string> = {
  BREAKFAST: 'text-amber-400',
  LUNCH:     'text-amber-400',
  DINNER:    'text-amber-400',
  SNACK:     'text-amber-400',
};

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

export const MealSection: React.FC<MealSectionProps> = ({ mealType, meals, date, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await api.meals.delete(id);
      onUpdate();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete item. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="bg-surface-alt rounded-2xl border border-surface-edge overflow-hidden">
        {/* Section header */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-7 h-7 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full ${MEAL_COLORS[mealType]}`}
              dangerouslySetInnerHTML={{ __html: MEAL_ICONS[mealType] }}
            />
            <div className="text-left">
              <p className="text-white font-bold text-sm">{MEAL_LABELS[mealType]}</p>
              <p className="text-text-muted text-xs">
                {meals.length} {meals.length === 1 ? 'item' : 'items'} ·{' '}
                <span className="text-primary font-semibold">{totalCalories.toFixed(0)} kcal</span>
              </p>
              {deleteError && (
                <p className="text-red-400 text-xs mt-0.5 font-medium">{deleteError}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-xs font-bold px-3 py-1.5 rounded-full"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
            <svg
              className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Food items list */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {meals.length === 0 ? (
                <div className="px-5 py-4 border-t border-surface-edge">
                  <p className="text-text-muted text-xs text-center py-2">
                    No food logged yet.{' '}
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="text-primary hover:underline font-semibold"
                    >
                      + Add food
                    </button>
                  </p>
                </div>
              ) : (
                <div className="border-t border-surface-edge divide-y divide-surface-edge/50">
                  <AnimatePresence>
                    {meals.map((meal) => (
                      <motion.div
                        key={meal.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        className="flex items-center justify-between px-5 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{meal.foodItemName}</p>
                          <div className="flex gap-3 mt-0.5 text-xs text-text-muted">
                            <span className="text-primary font-semibold">{meal.calories.toFixed(0)} kcal</span>
                            <span>P: {meal.protein.toFixed(1)}g</span>
                            <span>C: {meal.carbs.toFixed(1)}g</span>
                            <span>F: {meal.fat.toFixed(1)}g</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(meal.id)}
                          disabled={deletingId === meal.id}
                          className="ml-3 w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
                        >
                          {deletingId === meal.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FoodSearchModal
        isOpen={isModalOpen}
        mealType={mealType}
        date={date}
        onClose={() => setIsModalOpen(false)}
        onLogged={onUpdate}
      />
    </>
  );
};
