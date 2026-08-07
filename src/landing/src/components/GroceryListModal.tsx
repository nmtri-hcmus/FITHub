import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { GroceryItem } from '../lib/api';

interface GroceryListModalProps {
  isOpen: boolean;
  week: string;
  onClose: () => void;
}

// Simple category heuristic based on ingredient name keywords
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: '🥩 Proteins',    keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'egg', 'tofu', 'tempeh', 'steak', 'lamb', 'crab', 'lobster'] },
  { category: '🥛 Dairy',       keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'whey', 'cottage', 'mozzarella', 'cheddar', 'parmesan', 'kefir'] },
  { category: '🌾 Grains',      keywords: ['rice', 'bread', 'pasta', 'oat', 'flour', 'tortilla', 'cereal', 'quinoa', 'barley', 'wheat', 'noodle', 'cracker', 'bagel'] },
  { category: '🥦 Produce',     keywords: ['apple', 'banana', 'lettuce', 'spinach', 'broccoli', 'carrot', 'tomato', 'onion', 'garlic', 'pepper', 'cucumber', 'avocado', 'lemon', 'lime', 'berry', 'mushroom', 'kale', 'celery', 'zucchini', 'potato', 'sweet potato'] },
  { category: '🫙 Pantry',      keywords: ['oil', 'vinegar', 'sauce', 'soy', 'salt', 'pepper', 'spice', 'herb', 'sugar', 'honey', 'syrup', 'ketchup', 'mustard', 'mayo', 'dressing', 'stock', 'broth', 'coconut', 'almond'] },
];

function categorize(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return '📦 Other';
}

interface ManualItem {
  name: string;
  checked: boolean;
}

export const GroceryListModal: React.FC<GroceryListModalProps> = ({ isOpen, week, onClose }) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [newItemInput, setNewItemInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGroceryList();
      setCheckedItems({});
      setManualItems([]);
      setCopied(false);
    }
  }, [isOpen, week]);

  const fetchGroceryList = async () => {
    setIsLoading(true);
    try {
      const data = await api.calendar.groceryList(week);
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch grocery list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleManual = (idx: number) => {
    setManualItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it));
  };

  const removeManual = (idx: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addManualItem = () => {
    const name = newItemInput.trim();
    if (!name) return;
    setManualItems(prev => [...prev, { name, checked: false }]);
    setNewItemInput('');
  };

  const handleCopy = () => {
    const backendLines = items
      .map(item => `${checkedItems[item.ingredientName] ? '[x]' : '[ ]'} ${item.ingredientName}: ${item.quantities.join(', ')}`);
    const manualLines = manualItems.map(it => `${it.checked ? '[x]' : '[ ]'} ${it.name} (extra)`);
    const text = [...backendLines, ...manualLines].join('\n');
    navigator.clipboard.writeText(`Grocery List (${week}):\n${text}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  // Group items by category
  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const cat = categorize(item.ingredientName);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedCategories = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const checkedCount = Object.values(checkedItems).filter(Boolean).length
    + manualItems.filter(it => it.checked).length;
  const totalCount = items.length + manualItems.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface rounded-[2rem] shadow-2xl flex flex-col max-h-[88vh] border border-surface-edge overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-edge flex items-start justify-between bg-surface-alt">
          <div>
            <h2 className="text-xl font-bold text-white">Grocery List</h2>
            <p className="text-xs text-text-muted mt-0.5">Week {week}</p>
            {totalCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 rounded-full bg-surface-edge flex-1 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-muted font-semibold">{checkedCount}/{totalCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchGroceryList}
              title="Refresh list"
              className="p-2 text-text-muted hover:text-white bg-surface rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-white bg-surface rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted text-sm">Compiling ingredients…</p>
            </div>
          ) : items.length === 0 && manualItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-16 h-16 rounded-full bg-surface-alt border border-surface-edge flex items-center justify-center mx-auto text-3xl">🛒</div>
              <p className="text-text-muted font-semibold">No ingredients yet</p>
              <p className="text-text-subtle text-xs">Schedule meals in your calendar first, then refresh.</p>
            </div>
          ) : (
            <>
              {/* Categorized items from backend */}
              {sortedCategories.map(([category, catItems]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">{category}</h3>
                  <div className="space-y-1.5">
                    {catItems.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                          checkedItems[item.ingredientName]
                            ? 'bg-surface border-surface-edge opacity-50'
                            : 'bg-surface-alt border-surface-edge hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded accent-primary"
                          checked={!!checkedItems[item.ingredientName]}
                          onChange={() => toggleCheck(item.ingredientName)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold text-white ${checkedItems[item.ingredientName] ? 'line-through text-text-muted' : ''}`}>
                            {item.ingredientName}
                          </p>
                          <p className="text-xs text-text-muted">{item.quantities.join(' + ')}</p>
                        </div>
                        {item.totalOccurrences > 1 && (
                          <span className="shrink-0 bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            ×{item.totalOccurrences}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Manual extra items */}
              {manualItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">📝 Extra Items</h3>
                  <div className="space-y-1.5">
                    {manualItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          item.checked
                            ? 'bg-surface border-surface-edge opacity-50'
                            : 'bg-surface-alt border-surface-edge'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-primary"
                          checked={item.checked}
                          onChange={() => toggleManual(idx)}
                        />
                        <p className={`flex-1 text-sm text-white ${item.checked ? 'line-through text-text-muted' : ''}`}>{item.name}</p>
                        <button onClick={() => removeManual(idx)} className="text-text-subtle hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-edge bg-surface-alt space-y-3">
          {/* Add item input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemInput}
              onChange={e => setNewItemInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManualItem()}
              placeholder="Add extra item…"
              className="flex-1 bg-surface border border-surface-edge rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary outline-none"
            />
            <button
              onClick={addManualItem}
              disabled={!newItemInput.trim()}
              className="px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-bold rounded-xl transition-colors disabled:opacity-40 text-sm"
            >
              Add
            </button>
          </div>

          {/* Copy button */}
          {(items.length > 0 || manualItems.length > 0) && !isLoading && (
            <button
              onClick={handleCopy}
              className="w-full bg-surface text-text-muted hover:text-white hover:bg-surface-edge border border-surface-edge font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                  </svg>
                  Copy List to Clipboard
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
