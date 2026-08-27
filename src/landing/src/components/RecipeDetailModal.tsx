import React, { useState, useRef } from 'react';
import type { Recipe } from '../lib/api';
import { api } from '../lib/api';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOwner?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onSchedule?: (recipe: Recipe) => void;
  onSaveToLibrary?: (recipe: Recipe) => void;
}

const STATUS_CONFIG = {
  APPROVED: { label: 'Community Approved', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' },
  PENDING:  { label: 'Awaiting Review',    color: 'bg-amber-100 text-amber-700 border border-amber-200' },
  PRIVATE:  { label: 'Private',            color: 'bg-surface-edge text-text-muted border border-surface-edge' },
};

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOwner,
  isOpen,
  onClose,
  onDelete,
  onSchedule,
  onSaveToLibrary,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !recipe) return null;

  const statusCfg = STATUS_CONFIG[recipe.status] || STATUS_CONFIG.PRIVATE;
  const perServing = { calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat };

  const handleShareToCommunity = async (file?: File) => {
    setIsSharing(true);
    try {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const image = reader.result as string;
          localStorage.setItem(`fithub_recipe_image_${recipe.id}`, image);
          await api.recipes.update(recipe.id, { status: 'PENDING' });
          alert('Recipe shared to the community successfully!');
          onClose();
        };
        reader.readAsDataURL(file);
      } else {
        await api.recipes.update(recipe.id, { status: 'PENDING' });
        alert('Recipe shared to the community successfully!');
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to share recipe');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareClick = () => {
    if (!localStorage.getItem(`fithub_recipe_image_${recipe.id}`)) {
      fileInputRef.current?.click();
    } else {
      handleShareToCommunity();
    }
  };

  const handleSaveToLibrary = async () => {
    setIsSaving(true);
    try {
      // Clone the approved recipe as a private copy for the user
      await api.recipes.create({
        recipeName: recipe.recipeName,
        instructions: recipe.instructions,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        status: 'PRIVATE',
        ingredients: recipe.ingredients.map(ing => ({
          ingredientName: ing.ingredientName,
          quantity: ing.quantity,
        })),
      });
      setSaved(true);
      onSaveToLibrary?.(recipe);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this recipe permanently?')) return;
    setIsDeleting(true);
    try {
      await api.recipes.delete(recipe.id);
      onDelete?.(recipe.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete recipe');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format instructions into numbered steps
  const steps = recipe.instructions
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-[2rem] shadow-2xl flex flex-col max-h-[92vh] border border-surface-edge overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-edge">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white leading-tight">{recipe.recipeName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {recipe.user?.name && (
                  <span className="text-xs text-text-muted">By {recipe.user.name}</span>
                )}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-full bg-surface-edge text-text-muted hover:bg-gray-800 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Macro Summary Strip */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Calories', val: Math.round(perServing.calories), unit: 'kcal', color: 'bg-orange-50 border-orange-100' },
              { label: 'Protein',  val: Math.round(perServing.protein),  unit: 'g',    color: 'bg-blue-50 border-blue-100' },
              { label: 'Carbs',    val: Math.round(perServing.carbs),    unit: 'g',    color: 'bg-yellow-50 border-yellow-100' },
              { label: 'Fat',      val: Math.round(perServing.fat),      unit: 'g',    color: 'bg-red-50 border-red-100' },
            ].map(m => (
              <div key={m.label} className={`${m.color} border rounded-xl p-3 text-center`}>
                <p className="text-lg font-black text-white">{m.val}<span className="text-xs font-normal text-text-muted">{m.unit}</span></p>
                <p className="text-[10px] text-text-muted uppercase font-semibold tracking-wide mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary-dark text-xs">đŸ§‚</span>
              Ingredients
            </h3>
            {recipe.ingredients.length > 0 ? (
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm py-2 px-3 rounded-xl bg-surface-alt border border-surface-edge">
                    <span className="text-gray-200 font-medium">{ing.ingredientName}</span>
                    <span className="text-text-muted text-xs font-semibold">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-subtle italic">No ingredients listed.</p>
            )}
          </div>

          {/* Instructions */}
          {steps.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary-dark text-xs">đŸ“‹</span>
                Instructions
              </h3>
              <ol className="space-y-2">
                {steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white font-black flex items-center justify-center text-xs mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-edge bg-surface-alt flex flex-wrap items-center gap-3">
          {/* Save to library: only for community recipes (non-owners) */}
          {recipe.status === 'APPROVED' && !isOwner && (
            <button
              onClick={handleSaveToLibrary}
              disabled={isSaving || saved}
              className="flex-1 min-w-[140px] bg-surface-edge text-gray-200 hover:bg-gray-800 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm border border-surface-edge flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {isSaving ? 'Saving...' : 'Save to My Library'}
                </>
              )}
            </button>
          )}

          {/* Add to plan */}
          {onSchedule && (
            <button
              onClick={() => { onSchedule(recipe); onClose(); }}
              className="flex-1 min-w-[140px] bg-primary text-white hover:bg-primary-light font-bold py-2.5 px-5 rounded-xl transition-colors text-sm border border-primary-dark/15 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Diet Plan
            </button>
          )}

          {/* Share to Community: only for owners of private recipes */}
          {isOwner && recipe.status === 'PRIVATE' && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleShareToCommunity(file);
                }}
              />
              <button
                onClick={handleShareClick}
                disabled={isSharing}
                className="flex-1 min-w-[140px] bg-emerald-600 text-white hover:bg-emerald-700 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSharing ? 'Sharing...' : 'Share to Community đŸ†'}
              </button>
            </>
          )}

          {/* Delete: only for owners */}
          {isOwner && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
              title="Delete Recipe"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

