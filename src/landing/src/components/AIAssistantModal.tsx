import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type DailyDashboard, type Recipe, type MealType } from '../lib/api';

interface GeneratedRecipeResponse {
  recipeName: string;
  ingredients: { ingredientName: string; quantity: string; inDb?: boolean }[];
  instructions: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface AIAssistantModalProps {
  isOpen: boolean;
  date: string; // The date for which the user is generating a meal (usually today)
  onClose: () => void;
  onLogged: () => void;
}

const toLocalDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

const todayStr = () => toLocalDate(new Date());

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  date,
  onClose,
  onLogged,
}) => {
  const [dashboard, setDashboard] = useState<DailyDashboard | null>(null);
  const [isFetchingDashboard, setIsFetchingDashboard] = useState(false);
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipeResponse | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('LUNCH');
  const [isLogging, setIsLogging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRecipeImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Fetch the user's dashboard to check remaining macros (UC-07 A4)
  const fetchDashboard = useCallback(async () => {
    setIsFetchingDashboard(true);
    try {
      const data = await api.meals.getDashboard(date);
      setDashboard(data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard', err);
    } finally {
      setIsFetchingDashboard(false);
    }
  }, [date]);

  useEffect(() => {
    if (isOpen) {
      fetchDashboard();
      setIngredientsInput('');
      setGeneratedRecipe(null);
      setError(null);
      setQuantity(1);
      setSaveSuccess(false);
      setRecipeImage(null);
    }
  }, [isOpen, fetchDashboard]);

  // UC-07 A4: Macros already fulfilled warning
  const isFulfilled = dashboard?.targets && dashboard.consumed.calories >= dashboard.targets.calories;

  const handleGenerate = async () => {
    if (!ingredientsInput.trim()) {
      setError('Please provide at least one ingredient.');
      return;
    }
    const ingredients = ingredientsInput.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredients.length === 0) {
      setError('Please provide at least one ingredient.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const recipe = await api.ai.generateRecipe({
        availableIngredients: ingredients,
        date,
      }) as any;
      setGeneratedRecipe(recipe);
    } catch (err: any) {
      setError(err.message || 'The AI Assistant is currently unavailable. Please try again later.'); // UC-07 A2
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogMeal = async () => {
    if (!generatedRecipe) return;
    setIsLogging(true);
    setError(null);
    try {
      await api.meals.log({
        date,
        mealType: selectedMealType,
        foodItemName: generatedRecipe.recipeName,
        calories: parseFloat((generatedRecipe.macros.calories * quantity).toFixed(1)),
        protein: parseFloat((generatedRecipe.macros.protein * quantity).toFixed(1)),
        carbs: parseFloat((generatedRecipe.macros.carbs * quantity).toFixed(1)),
        fat: parseFloat((generatedRecipe.macros.fat * quantity).toFixed(1)),
      });
      onLogged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log the meal.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSaveRecipe = async (status: 'PRIVATE' | 'PENDING' = 'PRIVATE') => {
    if (!generatedRecipe) return;
    if (status === 'PENDING' && !recipeImage) {
      setError('An image is required to share this recipe with the community.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const saved = await api.recipes.create({
        recipeName: generatedRecipe.recipeName,
        instructions: generatedRecipe.instructions,
        calories: generatedRecipe.macros.calories,
        protein: generatedRecipe.macros.protein,
        carbs: generatedRecipe.macros.carbs,
        fat: generatedRecipe.macros.fat,
        ingredients: generatedRecipe.ingredients,
        status
      });
      if (recipeImage) {
        localStorage.setItem(`fithub_recipe_image_${saved.id}`, recipeImage);
      }
      console.log('[AIAssistantModal] Recipe saved successfully:', saved);
      setSaveSuccess(true);
      if (status === 'PENDING') {
        alert('Recipe shared to the community successfully!');
      }
    } catch (err: any) {
      console.error('[AIAssistantModal] Save recipe failed:', err);
      setError(err.message || 'Failed to save the recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-xl bg-surface border border-surface-edge rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-edge bg-[image:var(--background-image-gradient-forest)] relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="text-2xl">✨</span> AI Chef Assistant
                </h2>
                <p className="text-white/80 text-sm font-medium mt-1">
                  Tell me what's in your fridge, I'll handle the macros.
                </p>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-6">
              {!generatedRecipe ? (
                // --- PROMPT UI ---
                <>
                  {isFetchingDashboard ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Macro warnings */}
                      {isFulfilled && (
                        <div className="bg-orange-500/20 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="text-orange-400 font-bold text-sm">Macros already fulfilled</p>
                            <p className="text-orange-300/80 text-xs mt-0.5">
                              You have already hit your daily calorie target. Generating another meal will put you over your limit.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Remaining macros indicator */}
                      {dashboard?.targets && !isFulfilled && (
                        <div className="bg-surface-alt rounded-2xl p-4 border border-surface-edge">
                          <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Targeting remaining macros:</p>
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="text-primary">{Math.max(0, dashboard.targets.calories - dashboard.consumed.calories).toFixed(0)} kcal</span>
                            <span className="text-blue-400">{Math.max(0, dashboard.targets.protein - dashboard.consumed.protein).toFixed(0)}g Pro</span>
                            <span className="text-yellow-400">{Math.max(0, dashboard.targets.carbs - dashboard.consumed.carbs).toFixed(0)}g Carb</span>
                            <span className="text-orange-400">{Math.max(0, dashboard.targets.fat - dashboard.consumed.fat).toFixed(0)}g Fat</span>
                          </div>
                        </div>
                      )}

                      {/* Ingredient Input */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-white">What ingredients do you have?</label>
                        <textarea
                          rows={3}
                          placeholder="e.g., Chicken breast, rice, broccoli, soy sauce..."
                          value={ingredientsInput}
                          onChange={(e) => setIngredientsInput(e.target.value)}
                          className="w-full bg-surface border border-surface-edge rounded-xl p-4 text-white placeholder-text-muted focus:border-primary focus:outline-none transition-colors resize-none"
                        />
                        <p className="text-text-subtle text-xs">Separate ingredients with commas.</p>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                          {error}
                        </div>
                      )}

                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !ingredientsInput.trim()}
                        className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                            Consulting AI Chef...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Recipe
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              ) : (
                // --- RESULT UI ---
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="bg-surface-alt rounded-2xl p-5 border border-surface-edge">
                    <h3 className="text-xl font-bold text-white mb-2">{generatedRecipe.recipeName}</h3>
                    <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Ingredients:</p>
                    <ul className="text-text-subtle text-xs list-disc list-inside mb-4 space-y-1">
                      {generatedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-white font-medium">{ing.ingredientName}</span> ({ing.quantity})
                          {ing.inDb !== undefined && (
                            ing.inDb 
                              ? <span className="text-emerald-400" title="Verified in food database">✓</span> 
                              : <span className="text-amber-400" title="Not found in food database">⚠️</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Instructions:</p>
                    <p className="text-text-subtle text-xs leading-relaxed mb-4 whitespace-pre-line">{generatedRecipe.instructions}</p>
                    
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                        { label: 'Calories', value: generatedRecipe.macros.calories * quantity, unit: 'kcal', color: 'text-primary' },
                        { label: 'Protein',  value: generatedRecipe.macros.protein * quantity,  unit: 'g',    color: 'text-blue-400' },
                        { label: 'Carbs',    value: generatedRecipe.macros.carbs * quantity,    unit: 'g',    color: 'text-yellow-400' },
                        { label: 'Fat',      value: generatedRecipe.macros.fat * quantity,      unit: 'g',    color: 'text-orange-400' },
                      ].map(({ label, value, unit, color }) => (
                        <div key={label} className="bg-surface rounded-xl p-2.5 text-center border border-surface-edge">
                          <p className={`text-sm font-black ${color}`}>{value.toFixed(0)}</p>
                          <p className="text-text-muted text-xs">{unit}</p>
                          <p className="text-text-subtle text-[10px] mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantity and Meal Type Selection */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-text-muted">Servings</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(0.25, parseFloat((q - 0.25).toFixed(2))))}
                          className="w-8 h-8 rounded-full border border-surface-edge bg-surface text-white font-bold flex items-center justify-center hover:border-primary transition-colors"
                        >−</button>
                        <span className="w-8 text-center text-white font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => parseFloat((q + 0.25).toFixed(2)))}
                          className="w-8 h-8 rounded-full border border-surface-edge bg-surface text-white font-bold flex items-center justify-center hover:border-primary transition-colors"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-text-muted">Log to Meal</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as MealType[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectedMealType(m)}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                              selectedMealType === m
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-surface border-surface-edge text-text-muted hover:text-white'
                            }`}
                          >
                            {m.charAt(0) + m.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-xl flex items-start gap-3">
                      <span className="text-red-400 text-lg shrink-0">⚠️</span>
                      <div>
                        <p className="text-red-300 font-bold text-xs">Error</p>
                        <p className="text-red-400 text-xs mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}

                  {saveSuccess && (
                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-emerald-400 text-sm font-semibold">Saved to My Recipes</p>
                      </div>
                      <a
                        href="/recipes"
                        className="text-xs font-bold text-primary border border-primary/20 bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap"
                      >
                        View →
                      </a>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-2">
                      <div className="mb-2">
                        <label className="block text-xs font-semibold text-text-muted mb-1.5">Attach Image (Required for community sharing)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs text-white file:bg-surface file:border-surface-edge file:border file:text-white file:px-3 file:py-1.5 file:rounded-xl file:cursor-pointer file:font-bold file:mr-3 hover:file:bg-surface-alt transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleLogMeal}
                          disabled={isLogging || isSaving}
                          className="bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all flex items-center justify-center gap-2"
                        >
                          {isLogging ? (
                            <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                          ) : 'Log Meal'}
                        </button>

                        <button
                          onClick={() => handleSaveRecipe('PRIVATE')}
                          disabled={isLogging || isSaving || saveSuccess}
                          className={`font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border text-sm ${
                            saveSuccess
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-surface border-surface-edge text-white hover:bg-surface-alt'
                          }`}
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : saveSuccess ? (
                            'Saved ✓'
                          ) : (
                            'Save to Library'
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => handleSaveRecipe('PENDING')}
                        disabled={isLogging || isSaving || saveSuccess}
                        className="w-full bg-emerald-600 border border-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2 mt-1"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Share to Community 🏆'}
                      </button>

                    <button
                      onClick={() => { setGeneratedRecipe(null); setError(null); setSaveSuccess(false); setRecipeImage(null); }}
                      disabled={isLogging || isSaving}
                      className="w-full bg-surface border border-surface-edge text-text-muted hover:text-white font-bold py-3.5 rounded-xl hover:bg-surface-alt transition-all text-xs"
                    >
                      Decline & Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
