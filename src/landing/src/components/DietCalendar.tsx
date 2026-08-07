import React, { useState, useEffect, useRef } from 'react';
import { api, getISOWeek, getMondayOfWeek } from '../lib/api';
import type { DietCalendarEntry, MealType, Recipe, FoodSearchResult } from '../lib/api';
import { RecipeCard } from './RecipeCard';

interface DietCalendarProps {
  currentWeek: string;
  onWeekChange: (week: string) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: '🌅 Breakfast',
  LUNCH:     '☀️ Lunch',
  DINNER:    '🌙 Dinner',
  SNACK:     '🍎 Snack',
};

const todayWeek = getISOWeek(new Date());

function isPastWeek(weekStr: string): boolean {
  // Compare ISO week strings lexicographically — works because YYYY-Www format is sortable
  return weekStr < todayWeek;
}

export const DietCalendar: React.FC<DietCalendarProps> = ({ currentWeek, onWeekChange }) => {
  const [entries, setEntries] = useState<DietCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scheduling state
  const [schedulingSlot, setSchedulingSlot] = useState<{ date: string; mealType: MealType; existingEntry?: DietCalendarEntry } | null>(null);
  const [conflictMode, setConflictMode] = useState(false); // show "replace or cancel" prompt

  // Recipe / food search in scheduler
  const [schedulerSearch, setSchedulerSearch] = useState('');
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [schedulerTab, setSchedulerTab] = useState<'MY' | 'COMMUNITY' | 'FOOD'>('MY');
  const [isRecipesLoading, setIsRecipesLoading] = useState(false);
  const [isFoodSearching, setIsFoodSearching] = useState(false);
  const foodSearchDebounce = useRef<NodeJS.Timeout>(null);

  const readOnly = isPastWeek(currentWeek);

  useEffect(() => { fetchWeek(); }, [currentWeek]);

  const fetchWeek = async () => {
    setIsLoading(true);
    try {
      const data = await api.calendar.getWeek(currentWeek);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipesForScheduling = async () => {
    setIsRecipesLoading(true);
    try {
      const [mine, community] = await Promise.all([api.recipes.getMine(), api.recipes.getApproved()]);
      setMyRecipes(mine);
      setCommunityRecipes(community);
    } catch (err) {
      console.error('Failed to load recipes', err);
    } finally {
      setIsRecipesLoading(false);
    }
  };

  // Food search in scheduling modal
  useEffect(() => {
    if (schedulerTab !== 'FOOD') return;
    if (!schedulerSearch.trim()) { setFoodResults([]); return; }
    if (foodSearchDebounce.current) clearTimeout(foodSearchDebounce.current);
    setIsFoodSearching(true);
    foodSearchDebounce.current = setTimeout(async () => {
      try {
        const res = await api.food.search(schedulerSearch);
        setFoodResults(res);
      } catch { /* silent */ } finally {
        setIsFoodSearching(false);
      }
    }, 400);
    return () => { if (foodSearchDebounce.current) clearTimeout(foodSearchDebounce.current); };
  }, [schedulerSearch, schedulerTab]);

  const openSchedulingSlot = (date: string, mealType: MealType) => {
    if (readOnly) return;
    const existing = getEntry(dateToDate(date), mealType);
    if (existing) {
      // Show conflict prompt instead of immediately opening picker
      setSchedulingSlot({ date, mealType, existingEntry: existing });
      setConflictMode(true);
    } else {
      setSchedulingSlot({ date, mealType });
      setConflictMode(false);
      fetchRecipesForScheduling();
    }
  };

  const handleReplaceConfirm = async () => {
    if (!schedulingSlot?.existingEntry) return;
    // Delete the existing entry first, then open picker
    try {
      await api.calendar.deleteEntry(schedulingSlot.existingEntry.id);
      fetchWeek();
    } catch (err) {
      console.error('Failed to delete existing entry', err);
    }
    setConflictMode(false);
    fetchRecipesForScheduling();
  };

  const handlePrevWeek = () => {
    const monday = getMondayOfWeek(currentWeek);
    monday.setDate(monday.getDate() - 7);
    onWeekChange(getISOWeek(monday));
  };

  const handleNextWeek = () => {
    const monday = getMondayOfWeek(currentWeek);
    monday.setDate(monday.getDate() + 7);
    onWeekChange(getISOWeek(monday));
  };

  const handleDeleteEntry = async (id: string) => {
    if (readOnly) return;
    if (confirm('Remove this meal from your plan?')) {
      try {
        await api.calendar.deleteEntry(id);
        fetchWeek();
      } catch (err) {
        console.error('Failed to delete entry', err);
      }
    }
  };

  const handleScheduleRecipe = async (recipe: Recipe) => {
    if (!schedulingSlot) return;
    try {
      await api.calendar.schedule({ recipeId: recipe.id, date: schedulingSlot.date, mealType: schedulingSlot.mealType });
      setSchedulingSlot(null);
      fetchWeek();
    } catch (err) {
      console.error('Failed to schedule', err);
      alert('Failed to schedule recipe');
    }
  };

  // Build grid data
  const monday = getMondayOfWeek(currentWeek);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  const dateToDate = (dateStr: string) => new Date(dateStr + 'T12:00:00');

  const getEntry = (date: Date, mealType: MealType) => {
    const dateStr = date.toISOString().split('T')[0];
    return entries.find(e => e.date.startsWith(dateStr) && e.mealType === mealType);
  };

  // Filter recipes shown in scheduler by search
  const filteredMyRecipes = schedulerSearch
    ? myRecipes.filter(r => r.recipeName.toLowerCase().includes(schedulerSearch.toLowerCase()))
    : myRecipes;
  const filteredCommunityRecipes = schedulerSearch
    ? communityRecipes.filter(r => r.recipeName.toLowerCase().includes(schedulerSearch.toLowerCase()))
    : communityRecipes;

  return (
    <div className="w-full">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between mb-6 bg-surface-alt px-5 py-4 rounded-2xl border border-surface-edge">
        <button onClick={handlePrevWeek} className="p-2 bg-surface rounded-xl hover:bg-surface-edge text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold text-white">
            {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">{currentWeek}</p>
        </div>
        <button onClick={handleNextWeek} className="p-2 bg-surface rounded-xl hover:bg-surface-edge text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-surface-alt border border-surface-edge rounded-xl text-text-muted text-sm">
          <svg className="w-4 h-4 text-text-subtle shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Past weeks are read-only.
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-surface-alt rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* ── DESKTOP: 8-col grid (hidden on mobile) ── */}
          <div className="hidden md:block overflow-x-auto pb-4">
            <div className="min-w-[700px] grid grid-cols-8 gap-3">
              {/* Top-left empty */}
              <div />
              {/* Day headers */}
              {days.map((d, i) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = d.toISOString().split('T')[0] === todayStr;
                return (
                  <div key={i} className={`text-center p-2.5 rounded-xl border ${isToday ? 'bg-primary/10 border-primary/30' : 'bg-surface-alt border-surface-edge'}`}>
                    <p className="text-[10px] text-text-subtle uppercase font-semibold tracking-wider">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-base font-bold mt-0.5 ${isToday ? 'text-primary' : 'text-white'}`}>{d.getDate()}</p>
                  </div>
                );
              })}

              {/* Grid rows */}
              {mealTypes.map(meal => (
                <React.Fragment key={meal}>
                  <div className="flex items-center justify-end pr-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    {meal}
                  </div>
                  {days.map((d, i) => {
                    const entry = getEntry(d, meal);
                    const dateStr = d.toISOString().split('T')[0];
                    return (
                      <div
                        key={`${meal}-${i}`}
                        className={`h-24 rounded-xl border p-2 relative group overflow-hidden transition-all ${
                          readOnly
                            ? 'bg-surface/50 border-surface-edge/50 opacity-60'
                            : 'bg-surface-alt border-surface-edge'
                        }`}
                      >
                        {entry ? (
                          <div className="w-full h-full flex flex-col justify-between">
                            <p className="text-[11px] font-semibold text-white leading-tight truncate">{entry.recipe.recipeName}</p>
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] text-text-muted">{Math.round(entry.recipe.calories)} kcal</span>
                              {!readOnly && (
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 bg-red-500/10 p-1 rounded-lg"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          !readOnly && (
                            <button
                              onClick={() => openSchedulingSlot(dateStr, meal)}
                              className="w-full h-full border-2 border-dashed border-surface-edge/50 rounded-lg flex items-center justify-center text-text-subtle hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── MOBILE: Stacked day-by-day cards ── */}
          <div className="md:hidden space-y-3">
            {days.map((d, dayIdx) => {
              const todayStr = new Date().toISOString().split('T')[0];
              const dateStr = d.toISOString().split('T')[0];
              const isToday = dateStr === todayStr;
              return (
                <div key={dayIdx} className={`rounded-2xl border overflow-hidden ${isToday ? 'border-primary/30' : 'border-surface-edge'}`}>
                  {/* Day header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${isToday ? 'bg-primary/10' : 'bg-surface-alt'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${isToday ? 'text-primary' : 'text-white'}`}>{d.getDate()}</span>
                      <span className="text-sm font-semibold text-text-muted">
                        {d.toLocaleDateString('en-US', { weekday: 'long', month: 'short' })}
                      </span>
                    </div>
                    {isToday && <span className="text-[10px] bg-primary text-gray-900 font-bold px-2 py-0.5 rounded-full uppercase">Today</span>}
                  </div>

                  {/* Meal slots */}
                  <div className="divide-y divide-surface-edge bg-surface">
                    {mealTypes.map(meal => {
                      const entry = getEntry(d, meal);
                      return (
                        <div key={meal} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider w-20 shrink-0">
                            {meal}
                          </div>
                          <div className="flex-1 min-w-0">
                            {entry ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{entry.recipe.recipeName}</p>
                                  <p className="text-[10px] text-text-muted">{Math.round(entry.recipe.calories)} kcal</p>
                                </div>
                                {!readOnly && (
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="shrink-0 text-red-400 hover:text-red-300 bg-red-500/10 p-1.5 rounded-lg"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ) : (
                              !readOnly ? (
                                <button
                                  onClick={() => openSchedulingSlot(dateStr, meal)}
                                  className="text-xs text-text-subtle hover:text-primary flex items-center gap-1 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add meal
                                </button>
                              ) : (
                                <span className="text-xs text-text-subtle italic">—</span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Conflict Dialog (slot already filled) ── */}
      {schedulingSlot && conflictMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSchedulingSlot(null)} />
          <div className="relative w-full max-w-sm bg-surface rounded-[2rem] shadow-2xl border border-surface-edge p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
            <h3 className="text-lg font-bold text-white mb-2">Slot Already Filled</h3>
            <p className="text-text-muted text-sm mb-1">
              <strong className="text-white">{schedulingSlot.existingEntry?.recipe.recipeName}</strong>
            </p>
            <p className="text-text-subtle text-xs mb-6">
              This {schedulingSlot.mealType.toLowerCase()} slot already has a meal. Do you want to replace it?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSchedulingSlot(null)}
                className="flex-1 bg-surface-alt text-text-muted hover:text-white border border-surface-edge font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReplaceConfirm}
                className="flex-1 bg-amber-500 text-white hover:bg-amber-600 font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scheduling Modal (recipe / food picker) ── */}
      {schedulingSlot && !conflictMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSchedulingSlot(null)} />
          <div className="relative w-full max-w-4xl bg-surface rounded-[2rem] shadow-2xl flex flex-col h-[82vh] border border-surface-edge overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-edge flex items-center justify-between bg-surface-alt">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {MEAL_LABELS[schedulingSlot.mealType]}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{schedulingSlot.date}</p>
              </div>
              <button onClick={() => setSchedulingSlot(null)} className="p-2 text-text-muted hover:text-white bg-surface rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search + Tabs */}
            <div className="px-6 pt-4 pb-3 border-b border-surface-edge bg-surface-alt space-y-3">
              <div className="relative">
                <svg className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={schedulerTab === 'FOOD' ? 'Search food database…' : 'Search recipes by name…'}
                  value={schedulerSearch}
                  onChange={e => setSchedulerSearch(e.target.value)}
                  className="w-full bg-surface border border-surface-edge rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-1">
                {([['MY', 'My Recipes'], ['COMMUNITY', 'Community'], ['FOOD', 'Food DB']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => { setSchedulerTab(tab); setSchedulerSearch(''); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      schedulerTab === tab
                        ? 'bg-primary text-surface'
                        : 'text-text-muted hover:text-white bg-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isRecipesLoading ? (
                <div className="flex justify-center py-12 text-text-muted text-sm">Loading…</div>
              ) : schedulerTab === 'FOOD' ? (
                /* Food DB results */
                <div>
                  {isFoodSearching ? (
                    <div className="text-center text-text-muted text-sm py-8">Searching…</div>
                  ) : foodResults.length > 0 ? (
                    <div className="space-y-2">
                      {foodResults.map(food => (
                        <button
                          key={food.id}
                          onClick={() => {
                            // Schedule as a single-food entry — need a recipe wrapper
                            // For now, we'll just close and inform user to log via Food Diary
                            alert(`To log "${food.name}" as a meal, please use the Food Diary page (Log Food). The diet calendar currently supports recipe-based scheduling.`);
                          }}
                          className="w-full text-left flex justify-between items-center bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 hover:border-primary/40 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{food.name}</p>
                            <p className="text-xs text-text-muted">{food.brand || 'Generic'} · {food.servingSize}</p>
                          </div>
                          <p className="text-xs font-bold text-primary">{Math.round(food.calories)} kcal</p>
                        </button>
                      ))}
                    </div>
                  ) : schedulerSearch ? (
                    <div className="text-center py-12 text-text-muted text-sm">No foods found for "{schedulerSearch}"</div>
                  ) : (
                    <div className="text-center py-12 text-text-muted text-sm">Type to search the food database</div>
                  )}
                </div>
              ) : (
                /* Recipe lists */
                <div className="space-y-6">
                  {(() => {
                    const list = schedulerTab === 'MY' ? filteredMyRecipes : filteredCommunityRecipes;
                    if (list.length === 0) {
                      return (
                        <div className="text-center py-12 text-text-muted text-sm">
                          {schedulerSearch
                            ? `No recipes match "${schedulerSearch}"`
                            : schedulerTab === 'MY'
                            ? 'You have no recipes yet. Go to the Recipes page to create one!'
                            : 'No community recipes available.'}
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map(recipe => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onSchedule={handleScheduleRecipe}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
