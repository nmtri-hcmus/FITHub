import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import type { FoodSearchResult } from '../lib/api';

interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface IngredientRow {
  // Source: from DB search or manual
  type: 'db' | 'manual';
  food?: FoodSearchResult;
  // Manual entry fields
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quantity: string;
}

export const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({ isOpen, onClose, onSave }) => {
  const [recipeName, setRecipeName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState(1);
  const [status, setStatus] = useState<'PRIVATE' | 'PENDING'>('PRIVATE');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout>(null);

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualPro, setManualPro] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // Totals (for all servings)
  const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.type === 'db' ? ing.food!.calories : (Number(ing.calories) || 0)), 0);
  const totalProtein  = ingredients.reduce((sum, ing) => sum + (ing.type === 'db' ? ing.food!.protein  : (Number(ing.protein)  || 0)), 0);
  const totalCarbs    = ingredients.reduce((sum, ing) => sum + (ing.type === 'db' ? ing.food!.carbs    : (Number(ing.carbs)    || 0)), 0);
  const totalFat      = ingredients.reduce((sum, ing) => sum + (ing.type === 'db' ? ing.food!.fat      : (Number(ing.fat)      || 0)), 0);
  const safeServings  = Math.max(1, servings);
  const perServing    = {
    calories: totalCalories / safeServings,
    protein:  totalProtein  / safeServings,
    carbs:    totalCarbs    / safeServings,
    fat:      totalFat      / safeServings,
  };

  // Food search debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await api.food.search(searchQuery);
        setSearchResults(results);
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  const addFromDB = (food: FoodSearchResult) => {
    setIngredients([...ingredients, { type: 'db', food, quantity: food.servingSize }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addManual = () => {
    if (!manualName.trim()) return;
    setIngredients([...ingredients, {
      type: 'manual',
      name: manualName.trim(),
      calories: Number(manualCal) || 0,
      protein:  Number(manualPro)  || 0,
      carbs:    Number(manualCarb) || 0,
      fat:      Number(manualFat)  || 0,
      quantity: manualQty || '1 serving',
    }]);
    setManualName(''); setManualQty(''); setManualCal(''); setManualPro(''); setManualCarb(''); setManualFat('');
    setShowManualEntry(false);
  };

  const removeIngredient = (idx: number) => setIngredients(ingredients.filter((_, i) => i !== idx));

  const updateIngredientQty = (idx: number, val: string) => {
    const next = [...ingredients];
    next[idx].quantity = val;
    setIngredients(next);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!recipeName.trim() || !instructions.trim() || ingredients.length === 0) {
      setError('Please fill in the recipe name, instructions, and at least one ingredient.');
      return;
    }
    if (status === 'PENDING' && !image) {
      setError('An image is required to share this recipe with the community.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const created = await api.recipes.create({
        recipeName: recipeName.trim(),
        instructions: instructions.trim(),
        calories: perServing.calories,
        protein:  perServing.protein,
        carbs:    perServing.carbs,
        fat:      perServing.fat,
        status,
        ingredients: ingredients.map(ing => ({
          ingredientName: ing.type === 'db' ? ing.food!.name : ing.name!,
          quantity: ing.quantity,
        })),
      });
      if (image) {
        localStorage.setItem(`fithub_recipe_image_${created.id}`, image);
      }
      onSave();
      onClose();
      // Reset
      setRecipeName(''); setInstructions(''); setIngredients([]); setServings(1); setStatus('PRIVATE');
    } catch (err: any) {
      setError(err.message || 'Failed to create recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getIngLabel = (ing: IngredientRow) =>
    ing.type === 'db' ? ing.food!.name : `${ing.name} (manual)`;
  const getIngCal = (ing: IngredientRow) =>
    ing.type === 'db' ? Math.round(ing.food!.calories) : Math.round(Number(ing.calories) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-[2rem] shadow-2xl flex flex-col max-h-[92vh] border border-surface-edge overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-edge flex justify-between items-center bg-surface-alt">
          <h2 className="text-xl font-bold text-white">Create Recipe</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-gray-200 bg-surface-edge rounded-full">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Recipe Name *</label>
              <input
                type="text"
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g., Protein Oatmeal"
              />
            </div>

            {/* Servings */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Number of Servings</label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={e => setServings(Number(e.target.value))}
                  className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:bg-surface outline-none"
                  placeholder="1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Visibility</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                >
                  <option value="PRIVATE">Private (Only me)</option>
                  <option value="PENDING">Submit to Community</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Instructions *</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full bg-surface-alt border border-surface-edge rounded-xl px-4 py-3 text-white focus:border-primary focus:bg-surface outline-none h-28 resize-none"
                placeholder="Step 1: â€¦&#10;Step 2: â€¦&#10;Step 3: â€¦"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Recipe Image {status === 'PENDING' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer"
              />
              {status === 'PENDING' && !image && (
                <p className="text-xs text-red-500 mt-1">An image is required for community recipes.</p>
              )}
              {image && (
                <div className="mt-4 border border-surface-edge rounded-xl overflow-hidden bg-surface-alt max-h-48 flex items-center justify-center">
                  <img src={image} alt="Preview" className="max-h-48 object-contain" />
                </div>
              )}
            </div>
          </div>

          <hr className="border-surface-edge" />

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ingredients *</label>
              <button
                type="button"
                onClick={() => setShowManualEntry(v => !v)}
                className="text-xs text-primary-dark font-semibold hover:underline flex items-center gap-1"
              >
                {showManualEntry ? 'Cancel manual entry' : '+ Add manually'}
              </button>
            </div>

            {/* Added ingredients */}
            {ingredients.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-surface-alt border border-surface-edge rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{getIngLabel(ing)}</p>
                      <p className="text-xs text-text-muted">{getIngCal(ing)} kcal
                        {ing.type === 'manual' && <span className="ml-1 text-amber-600">Â· User-entered</span>}
                      </p>
                    </div>
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={e => updateQuantity(idx, e.target.value)}
                      className="w-24 bg-surface border border-surface-edge rounded-lg px-3 py-1.5 text-xs text-white focus:border-primary outline-none"
                      placeholder="Qty"
                    />
                    <button onClick={() => removeIngredient(idx)} className="p-1.5 text-text-subtle hover:text-red-600 bg-surface border border-surface-edge rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual entry form */}
            {showManualEntry && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Manual Ingredient Entry</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ingredient name" className="col-span-2 bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                  <input type="text" value={manualQty} onChange={e => setManualQty(e.target.value)} placeholder="Quantity (e.g. 100g)" className="bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                  <input type="number" value={manualCal} onChange={e => setManualCal(e.target.value)} placeholder="Calories" className="bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                  <input type="number" value={manualPro} onChange={e => setManualPro(e.target.value)} placeholder="Protein (g)" className="bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                  <input type="number" value={manualCarb} onChange={e => setManualCarb(e.target.value)} placeholder="Carbs (g)" className="bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                  <input type="number" value={manualFat} onChange={e => setManualFat(e.target.value)} placeholder="Fat (g)" className="col-span-2 bg-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" />
                </div>
                <button
                  type="button"
                  onClick={addManual}
                  disabled={!manualName.trim()}
                  className="w-full bg-amber-500 text-white font-bold py-2 rounded-xl hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
                >
                  Add Ingredient
                </button>
              </div>
            )}

            {/* DB Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search food database to add ingredientâ€¦"
                className="w-full bg-surface-alt border border-surface-edge rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-primary focus:bg-surface outline-none"
              />
              <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {(searchQuery || isSearching) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-edge rounded-xl shadow-xl overflow-hidden z-10 max-h-52 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-text-subtle">Searchingâ€¦</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => addFromDB(result)}
                        className="w-full text-left px-4 py-3 border-b border-surface-edge hover:bg-surface-alt transition-colors flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{result.name}</p>
                          <p className="text-xs text-text-subtle">{result.brand || 'Generic'} Â· {result.servingSize}</p>
                        </div>
                        <p className="text-xs font-semibold text-primary-dark ml-2 shrink-0">{Math.round(result.calories)} kcal</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-text-subtle">
                      No results.{' '}
                      <button
                        className="text-primary-dark font-semibold hover:underline"
                        onClick={() => { setSearchQuery(''); setShowManualEntry(true); }}
                      >
                        Add manually instead?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Macro Summary + Save */}
        <div className="px-6 py-4 border-t border-surface-edge bg-surface-alt">
          {/* Per-serving macros */}
          <div className="flex gap-4 mb-4">
            {[
              { label: 'Per Serving â€” Cal',   val: Math.round(perServing.calories) },
              { label: 'Protein',              val: `${Math.round(perServing.protein)}g` },
              { label: 'Carbs',                val: `${Math.round(perServing.carbs)}g` },
              { label: 'Fat',                  val: `${Math.round(perServing.fat)}g` },
            ].map(m => (
              <div key={m.label} className="flex-1 text-center">
                <p className="text-xs text-text-muted uppercase font-semibold truncate">{m.label}</p>
                <p className="text-sm font-black text-gray-200">{m.val}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSubmitting || ingredients.length === 0}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-primary-dark/15"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
            )}
            Save Recipe
          </button>
        </div>
      </div>
    </div>
  );
};

