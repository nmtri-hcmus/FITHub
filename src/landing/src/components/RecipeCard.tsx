import React, { useState } from 'react';
import type { Recipe } from '../lib/api';
import { api } from '../lib/api';

interface RecipeCardProps {
  recipe: Recipe;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onSchedule?: (recipe: Recipe) => void;
  onClick?: (recipe: Recipe) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Community',      className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  PENDING:  { label: 'Awaiting Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  PRIVATE:  { label: 'Private',         className: 'bg-surface-edge text-text-muted border border-surface-edge' },
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isOwner, onDelete, onSchedule, onClick }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open detail modal
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    setIsDeleting(true);
    try {
      await api.recipes.delete(recipe.id);
      onDelete?.(recipe.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete recipe');
    } finally {
      setIsDeleting(false);
    }
  };

  const badge = STATUS_BADGE[recipe.status];

  return (
    <div
      onClick={() => onClick?.(recipe)}
      className="bg-surface rounded-2xl p-5 flex flex-col h-full border border-surface-edge shadow-sm hover:shadow-md hover:border-gray-700 transition-all relative overflow-hidden group cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight truncate">{recipe.recipeName}</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {recipe.user?.name ? `By ${recipe.user.name}` : 'Custom Recipe'}
          </p>
        </div>
        {badge && (
          <span className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: 'kcal', val: Math.round(recipe.calories) },
          { label: 'Pro',  val: `${Math.round(recipe.protein)}g` },
          { label: 'Carb', val: `${Math.round(recipe.carbs)}g` },
          { label: 'Fat',  val: `${Math.round(recipe.fat)}g` },
        ].map(m => (
          <div key={m.label} className="bg-surface-alt border border-surface-edge rounded-lg py-1.5 flex flex-col items-center">
            <span className="text-xs font-bold text-white">{m.val}</span>
            <span className="text-[9px] text-text-muted uppercase">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Instructions preview */}
      <div className="text-xs text-text-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
        {recipe.instructions || 'No instructions provided.'}
      </div>

      {/* "View details" hint */}
      <div className="text-[10px] text-text-subtle font-medium mb-3 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Click to view full recipe
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-auto">
        {onSchedule && (
          <button
            onClick={(e) => { e.stopPropagation(); onSchedule(recipe); }}
            className="flex-1 bg-primary text-white font-bold py-2 rounded-xl hover:bg-primary-light transition-colors text-xs border border-primary-dark/15"
          >
            Add to Plan
          </button>
        )}
        {isOwner && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60 shrink-0"
            title="Delete Recipe"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

