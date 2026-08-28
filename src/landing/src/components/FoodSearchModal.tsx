import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type FoodSearchResult, type MealType } from '../lib/api';

interface FoodSearchModalProps {
  isOpen: boolean;
  mealType: MealType;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

// Highlight matched characters in a string
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/25 text-primary rounded-sm px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// Skeleton row while loading
const SkeletonRow: React.FC = () => (
  <div className="flex items-center justify-between px-4 py-3 animate-pulse">
    <div className="flex-1 space-y-1.5">
      <div className="h-3 bg-surface-edge rounded w-3/5" />
      <div className="h-2.5 bg-surface-edge rounded w-2/5 opacity-60" />
    </div>
    <div className="ml-3 space-y-1.5 text-right">
      <div className="h-3 bg-surface-edge rounded w-12" />
      <div className="h-2.5 bg-surface-edge rounded w-8 opacity-60 ml-auto" />
    </div>
  </div>
);

// â”€â”€ Scanner Mode (UC-06) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ScanMode = 'BARCODE' | 'OCR';

interface ScannerPanelProps {
  onFoodFound: (food: FoodSearchResult) => void;
  onClose: () => void;
}

const ScannerPanel: React.FC<ScannerPanelProps> = ({ onFoodFound, onClose }) => {
  const [scanMode, setScanMode] = useState<ScanMode>('BARCODE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleBarcodeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setScanError(null);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const imgUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imgUrl;
      await new Promise((r) => (img.onload = r));
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const result = await reader.decodeFromCanvas(canvas);
      URL.revokeObjectURL(imgUrl);
      if (result?.getText()) {
        const food = await api.food.barcode(result.getText());
        onFoodFound(food);
      } else {
        setScanError('Could not detect barcode. Try a clearer photo.');
      }
    } catch {
      setScanError('Could not read barcode. Try searching manually.');
    } finally {
      setIsProcessing(false);
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
    }
  };

  const handleOCRFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setScanError(null);
    try {
      // Convert the image file to base64 to send to the backend
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await api.food.scanLabel(base64);
      const { estimatedMacros, servingSize, productName } = result;

      // Map the OCR result into a FoodSearchResult so the rest of the flow works
      const food: FoodSearchResult = {
        id: `ocr-${Date.now()}`,
        name: productName || 'Scanned Nutrition Label',
        calories: estimatedMacros.calories,
        protein: estimatedMacros.protein,
        carbs: estimatedMacros.carbs,
        fat: estimatedMacros.fat,
        servingSize: servingSize || '1 serving',
      };

      onFoodFound(food);
    } catch (err: any) {
      setScanError(err.message || 'Could not read the nutrition label. Please ensure the label is clear and well-lit.');
    } finally {
      setIsProcessing(false);
      if (ocrInputRef.current) ocrInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode switcher */}
      <div className="flex items-center bg-surface rounded-xl p-1 border border-surface-edge">
        {(['BARCODE', 'OCR'] as ScanMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => { setScanMode(mode); setScanError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              scanMode === mode
                ? 'bg-primary text-surface shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            {mode === 'BARCODE' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h1v8H7zM12 8h1v4h-1zM17 8h.01M12 14h.01M17 14h1v2h-1z" />
                </svg>
                Barcode
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Nutrition Label
              </>
            )}
          </button>
        ))}
      </div>

      {/* Viewfinder area */}
      <div
        className="relative h-48 rounded-2xl border-2 border-dashed border-surface-edge bg-surface overflow-hidden flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
        onClick={() => scanMode === 'BARCODE' ? barcodeInputRef.current?.click() : ocrInputRef.current?.click()}
      >
        {/* Corner marks for viewfinder effect */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />

        {isProcessing ? (
          <>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-xs">
              {scanMode === 'BARCODE' ? 'Reading barcodeâ€¦' : 'Scanning labelâ€¦'}
            </p>
            {/* Animated scan line */}
            <div className="absolute left-4 right-4 h-0.5 bg-primary/60 animate-bounce" style={{ top: '50%' }} />
          </>
        ) : (
          <>
            {scanMode === 'BARCODE' ? (
              <svg className="w-10 h-10 text-text-subtle group-hover:text-primary/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h1v8H7zM12 8h1v4h-1zM17 8h.01M12 14h.01M17 14h1v2h-1z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-text-subtle group-hover:text-primary/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <div className="text-center px-4">
              <p className="text-text-muted text-sm font-semibold">
                {scanMode === 'BARCODE' ? 'Tap to scan barcode' : 'Tap to scan nutrition label'}
              </p>
              <p className="text-text-subtle text-xs mt-1">
                {scanMode === 'BARCODE'
                  ? 'Take a photo of the product barcode'
                  : 'Take a photo of the nutrition facts panel'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={barcodeInputRef} type="file" accept="image/*" capture="environment" onChange={handleBarcodeFile} className="hidden" />
      <input ref={ocrInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCRFile} className="hidden" />

      {scanError && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs font-medium">{scanError}</p>
        </div>
      )}

      <button onClick={onClose} className="text-center text-xs text-text-muted hover:text-white transition-colors">
        â† Back to search
      </button>
    </div>
  );
};

// â”€â”€ Manual Entry Panel (UC-04 A1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ── Recipe List Panel ────────────────────────────────────────────────────────
interface RecipeListPanelProps {
  mealType: MealType;
  date: string;
  onLogged: () => void;
  onClose: () => void;
}

const RecipeListPanel: React.FC<RecipeListPanelProps> = ({ mealType, date, onLogged, onClose }) => {
  const [recipes, setRecipes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLogging, setIsLogging] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      api.recipes.getMine().catch(() => []),
      api.recipes.getApproved().catch(() => []),
    ]).then(([mine, approved]) => {
      const all = [...mine, ...approved];
      const unique = Array.from(new Map(all.map(r => [r.id, r])).values());
      setRecipes(unique);
      setIsLoading(false);
    });
  }, []);

  const handleLogRecipe = async (recipe: any) => {
    setIsLogging(recipe.id);
    try {
      await api.meals.log({
        date,
        mealType,
        foodItemName: recipe.recipeName + " (Recipe)",
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      });
      onLogged();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to log recipe');
    } finally {
      setIsLogging(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white transition-colors bg-surface border border-surface-edge rounded-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h4 className="text-white font-bold text-sm">Log a Recipe</h4>
          <p className="text-text-subtle text-xs">Choose from your saved meals</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : recipes.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No recipes found. Save some recipes first!</p>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.id} className="bg-surface border border-surface-edge rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-white font-bold text-sm">{recipe.recipeName}</h5>
                  <p className="text-primary text-xs font-bold mt-0.5">{recipe.calories} kcal</p>
                </div>
                <button
                  onClick={() => handleLogRecipe(recipe)}
                  disabled={isLogging === recipe.id}
                  className="bg-primary text-surface px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {isLogging === recipe.id ? 'Logging...' : 'Log Recipe'}
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-emerald-400">P: {recipe.protein}g</span>
                <span className="text-amber-400">C: {recipe.carbs}g</span>
                <span className="text-orange-400">F: {recipe.fat}g</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface ManualEntryPanelProps {
  mealType: MealType;
  date: string;
  onLogged: () => void;
  onClose: () => void;
}

const ManualEntryPanel: React.FC<ManualEntryPanelProps> = ({ mealType, date, onLogged, onClose }) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calNum = parseFloat(calories) || 0;
  const proNum = parseFloat(protein) || 0;
  const carbNum = parseFloat(carbs) || 0;
  const fatNum = parseFloat(fat) || 0;

  const handleLog = async () => {
    if (!name.trim()) { setError('Please enter a food name.'); return; }
    if (!calories) { setError('Please enter calories.'); return; }
    setIsLogging(true);
    setError(null);
    try {
      await api.meals.log({
        date,
        mealType,
        foodItemName: name.trim(),
        calories: calNum,
        protein: proNum,
        carbs: carbNum,
        fat: fatNum,
      });
      onLogged();
    } catch (err: any) {
      setError(err.message || 'Failed to log food');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white transition-colors bg-surface border border-surface-edge rounded-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h4 className="text-white font-bold text-sm">Add Custom Food</h4>
          <p className="text-text-subtle text-xs">Enter nutrition info manually</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Food Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Home-made protein shake"
          className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-white text-sm placeholder-text-subtle focus:border-primary focus:outline-none transition-colors"
          autoFocus
        />
      </div>

      {/* Macros grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Calories (kcal) *</label>
          <input
            type="number"
            min="0"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            placeholder="e.g., 350"
            className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-white text-sm placeholder-text-subtle focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Protein (g)</label>
          <input
            type="number"
            min="0"
            value={protein}
            onChange={e => setProtein(e.target.value)}
            placeholder="0"
            className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-white text-sm placeholder-text-subtle focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Carbs (g)</label>
          <input
            type="number"
            min="0"
            value={carbs}
            onChange={e => setCarbs(e.target.value)}
            placeholder="0"
            className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-white text-sm placeholder-text-subtle focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Fat (g)</label>
          <input
            type="number"
            min="0"
            value={fat}
            onChange={e => setFat(e.target.value)}
            placeholder="0"
            className="w-full bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-white text-sm placeholder-text-subtle focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Live macro preview */}
      {(calNum > 0 || proNum > 0 || carbNum > 0 || fatNum > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Cal',  val: calNum,  color: 'text-primary' },
            { label: 'Pro',  val: proNum,  color: 'text-blue-400' },
            { label: 'Carb', val: carbNum, color: 'text-yellow-400' },
            { label: 'Fat',  val: fatNum,  color: 'text-orange-400' },
          ].map(m => (
            <div key={m.label} className="bg-surface rounded-xl p-2.5 text-center border border-surface-edge">
              <p className={`text-sm font-black ${m.color}`}>{m.val.toFixed(0)}</p>
              <p className="text-text-subtle text-[10px] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLog}
        disabled={isLogging || !name.trim() || !calories}
        className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLogging && <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />}
        {isLogging ? 'Loggingâ€¦' : `Add to ${MEAL_LABELS[mealType]}`}
      </button>
    </div>
  );
};

// â”€â”€ Main Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ModalView = 'SEARCH' | 'SCANNER' | 'MANUAL' | 'RECIPES';

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  mealType,
  date,
  onClose,
  onLogged,
}) => {
  const [view, setView] = useState<ModalView>('SEARCH');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [quantity, setQuantity] = useState(1);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-session query cache
  const cacheRef = useRef<Map<string, FoodSearchResult[]>>(new Map());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const displayedResults = useMemo(() => results.slice(0, 8), [results]);
  const showDropdown = !selected && query.trim().length >= 2;

  // Debounced search with cache
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      setHighlightedIndex(-1);
      return;
    }
    const cacheKey = trimmed.toLowerCase();
    if (cacheRef.current.has(cacheKey)) {
      setResults(cacheRef.current.get(cacheKey)!);
      setHasSearched(true);
      setHighlightedIndex(-1);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setIsSearching(true);
    setHasSearched(false);
    setHighlightedIndex(-1);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await api.food.search(trimmed);
        const filtered = data.filter((r) => r.name);
        cacheRef.current.set(cacheKey, filtered);
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 200);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setView('SEARCH');
      setQuery('');
      setResults([]);
      setSelected(null);
      setQuantity(1);
      setError(null);
      setHasSearched(false);
      setHighlightedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = useCallback((item: FoodSearchResult) => {
    setSelected(item);
    setQuery(item.name ?? '');
    setResults([]);
    setQuantity(1);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || displayedResults.length === 0) {
        if (e.key === 'Escape') onClose();
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => (i + 1) % displayedResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => (i <= 0 ? displayedResults.length - 1 : i - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && displayedResults[highlightedIndex]) {
            handleSelect(displayedResults[highlightedIndex]);
          } else if (displayedResults.length > 0) {
            handleSelect(displayedResults[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (query) { setQuery(''); setResults([]); } else { onClose(); }
          break;
      }
    },
    [showDropdown, displayedResults, highlightedIndex, handleSelect, query, onClose]
  );

  const handleLog = async () => {
    if (!selected) return;
    setIsLogging(true);
    setError(null);
    try {
      await api.meals.log({
        date,
        mealType,
        foodItemName: selected.name,
        calories: parseFloat((selected.calories * quantity).toFixed(1)),
        protein: parseFloat((selected.protein * quantity).toFixed(1)),
        carbs: parseFloat((selected.carbs * quantity).toFixed(1)),
        fat: parseFloat((selected.fat * quantity).toFixed(1)),
      });
      onLogged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log food');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full md:max-w-lg bg-[#1e1f26] border border-surface-edge rounded-t-3xl md:rounded-3xl p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
              style={{ boxShadow: '0 -8px 60px rgba(0,0,0,0.6)' }}
            >
              {/* Header (always visible) */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">Add Food</h3>
                  <p className="text-text-subtle text-xs font-medium mt-0.5">â†’ {MEAL_LABELS[mealType]}</p>
                </div>
                <div className="flex items-center gap-2">
                                      {/* Recipes toggle */}
                    {view === 'SEARCH' && (
                      <button
                        onClick={() => setView('RECIPES')}
                        title="Log a saved recipe"
                        className="w-9 h-9 rounded-full bg-surface border border-surface-edge flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </button>
                    )}
                    {/* Scanner toggle */}
                  {view === 'SEARCH' && (
                    <button
                      onClick={() => setView('SCANNER')}
                      title="Scan barcode or nutrition label"
                      className="w-9 h-9 rounded-full bg-surface border border-surface-edge flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h1v8H7zM12 8h1v4h-1zM17 8h.01M12 14h.01M17 14h1v2h-1z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-surface border border-surface-edge flex items-center justify-center text-text-muted hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* View: Scanner */}
              {view === 'SCANNER' && (
                <ScannerPanel
                  onFoodFound={(food) => { handleSelect(food); setView('SEARCH'); }}
                  onClose={() => setView('SEARCH')}
                />
              )}

                            {/* View: Recipes */}
              {view === 'RECIPES' && (
                <RecipeListPanel
                  mealType={mealType}
                  date={date}
                  onLogged={() => { onLogged(); onClose(); }}
                  onClose={() => setView('SEARCH')}
                />
              )}

              {/* View: Manual Entry */}
              {view === 'MANUAL' && (
                <ManualEntryPanel
                  mealType={mealType}
                  date={date}
                  onLogged={() => { onLogged(); onClose(); }}
                  onClose={() => setView('SEARCH')}
                />
              )}

              {/* View: Search */}
              {view === 'SEARCH' && (
                <>
                  {/* Search input */}
                  <div className="relative">
                    <svg
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search food... (â†‘â†“ to navigate)"
                      value={query}
                      autoComplete="off"
                      onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-surface border border-surface-edge rounded-xl pl-10 pr-10 py-3 text-white placeholder-text-muted focus:border-primary focus:outline-none transition-colors text-sm"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : query ? (
                        <button
                          onClick={() => { setQuery(''); setSelected(null); setResults([]); searchInputRef.current?.focus(); }}
                          className="text-text-muted hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Autocomplete dropdown */}
                  <AnimatePresence>
                    {showDropdown && (isSearching || displayedResults.length > 0 || hasSearched) && (
                      <motion.div
                        ref={listRef}
                        key="results"
                        initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{ transformOrigin: 'top' }}
                        className="border border-surface-edge rounded-2xl overflow-hidden -mt-2 bg-[#1a1b22]"
                      >
                        {isSearching ? (
                          <>
                            <SkeletonRow />
                            <div className="border-t border-surface-edge/50"><SkeletonRow /></div>
                            <div className="border-t border-surface-edge/50"><SkeletonRow /></div>
                          </>
                        ) : displayedResults.length === 0 && hasSearched ? (
                          <div className="flex flex-col items-center py-6 px-4 text-center gap-2">
                            <span className="text-3xl">đŸ”</span>
                            <p className="text-white text-sm font-semibold">No results for "{query}"</p>
                            <p className="text-text-muted text-xs">Try a different spelling or shorter term</p>
                            <button
                              onClick={() => setView('MANUAL')}
                              className="mt-2 text-xs font-bold text-primary border border-primary/20 bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors"
                            >
                              + Add manually instead
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-surface-edge/50">
                            {displayedResults.map((item, index) => (
                              <button
                                key={item.id}
                                ref={(el) => { itemRefs.current[index] = el; }}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`w-full text-left flex items-center justify-between px-4 py-3 transition-colors ${
                                  highlightedIndex === index
                                    ? 'bg-primary/10 border-l-2 border-primary'
                                    : 'hover:bg-surface-alt border-l-2 border-transparent'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium truncate">
                                    <Highlight text={item.name ?? ''} query={query} />
                                  </p>
                                  {item.brand && (
                                    <p className="text-text-muted text-xs truncate mt-0.5">
                                      <Highlight text={item.brand} query={query} />
                                    </p>
                                  )}
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                  <p className="text-primary text-sm font-bold">{item.calories.toFixed(0)} kcal</p>
                                  <p className="text-text-muted text-xs">{item.servingSize}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Keyboard hint */}
                        {!isSearching && displayedResults.length > 0 && (
                          <div className="border-t border-surface-edge/30 px-4 py-2 flex gap-4 bg-surface/30">
                            <span className="text-text-muted text-[10px] flex items-center gap-1">
                              <kbd className="bg-surface border border-surface-edge px-1 rounded text-[10px]">â†‘â†“</kbd> Navigate
                            </span>
                            <span className="text-text-muted text-[10px] flex items-center gap-1">
                              <kbd className="bg-surface border border-surface-edge px-1 rounded text-[10px]">â†µ</kbd> Select
                            </span>
                            <span className="text-text-muted text-[10px] flex items-center gap-1">
                              <kbd className="bg-surface border border-surface-edge px-1 rounded text-[10px]">Esc</kbd> Clear
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* "Add manually" shortcut when no query */}
                  {!query && !selected && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-surface-edge" />
                      <button
                        onClick={() => setView('MANUAL')}
                        className="text-xs text-text-muted hover:text-primary transition-colors font-medium shrink-0"
                      >
                        + Add food manually
                      </button>
                      <div className="flex-1 h-px bg-surface-edge" />
                    </div>
                  )}

                  {/* Selected item form */}
                  <AnimatePresence>
                    {selected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col gap-4"
                      >
                        {/* Selected food card */}
                        <div className="bg-surface rounded-2xl border border-primary/20 p-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{selected.name}</p>
                            {selected.brand && <p className="text-text-muted text-xs">{selected.brand}</p>}
                            <p className="text-text-subtle text-xs mt-1">{selected.servingSize} per serving</p>
                          </div>
                          <button
                            onClick={() => { setSelected(null); setQuery(''); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                            className="text-text-muted hover:text-white ml-3 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Macro preview tiles */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Calories', value: selected.calories * quantity, unit: 'kcal', color: 'text-primary' },
                            { label: 'Protein',  value: selected.protein  * quantity, unit: 'g',    color: 'text-blue-400' },
                            { label: 'Carbs',    value: selected.carbs    * quantity, unit: 'g',    color: 'text-yellow-400' },
                            { label: 'Fat',      value: selected.fat      * quantity, unit: 'g',    color: 'text-orange-400' },
                          ].map(({ label, value, unit, color }) => (
                            <div key={label} className="bg-surface rounded-xl p-3 text-center border border-surface-edge">
                              <p className={`text-sm font-black ${color}`}>{value.toFixed(1)}</p>
                              <p className="text-text-muted text-xs">{unit}</p>
                              <p className="text-text-subtle text-[10px] mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Quantity stepper */}
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-bold uppercase tracking-wider text-text-subtle whitespace-nowrap">Servings</label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setQuantity((q) => Math.max(0.25, parseFloat((q - 0.25).toFixed(2))))}
                              className="w-8 h-8 rounded-full border border-surface-edge bg-surface text-white font-bold hover:border-primary transition-colors flex items-center justify-center"
                            >âˆ’</button>
                            <input
                              type="number"
                              min="0.25"
                              step="0.25"
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(0.25, parseFloat(e.target.value) || 1))}
                              className="w-16 text-center bg-surface border border-surface-edge rounded-xl py-1.5 text-white font-bold text-sm focus:border-primary focus:outline-none"
                            />
                            <button
                              onClick={() => setQuantity((q) => parseFloat((q + 0.25).toFixed(2)))}
                              className="w-8 h-8 rounded-full border border-surface-edge bg-surface text-white font-bold hover:border-primary transition-colors flex items-center justify-center"
                            >+</button>
                          </div>
                        </div>

                        {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                        <button
                          onClick={handleLog}
                          disabled={isLogging}
                          className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLogging ? 'Logging...' : `Add to ${MEAL_LABELS[mealType]}`}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


