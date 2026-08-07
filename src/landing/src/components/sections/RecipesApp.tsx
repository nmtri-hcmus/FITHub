import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import type { Recipe } from '../../lib/api';
import { RecipeCard } from '../RecipeCard';
import { RecipeBuilderModal } from '../RecipeBuilderModal';
import { RecipeDetailModal } from '../RecipeDetailModal';

type FilterPreset = 'ALL' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'LOW_CALORIE';

const FILTER_LABELS: Record<FilterPreset, string> = {
  ALL:          'All',
  HIGH_PROTEIN: 'High Protein',
  LOW_CARB:     'Low Carb',
  LOW_CALORIE:  'Low Calorie',
};

export const RecipesApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMUNITY' | 'MINE'>('COMMUNITY');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPreset>('ALL');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const [community, mine] = await Promise.all([
        api.recipes.getApproved(),
        api.recipes.getMine(),
      ]);
      setCommunityRecipes(community);
      setMyRecipes(mine);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const baseRecipes = activeTab === 'COMMUNITY' ? communityRecipes : myRecipes;

  // Apply search + filter
  const filteredRecipes = useMemo(() => {
    let list = baseRecipes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.recipeName.toLowerCase().includes(q));
    }
    switch (activeFilter) {
      case 'HIGH_PROTEIN': return list.filter(r => r.protein >= 25);
      case 'LOW_CARB':     return list.filter(r => r.carbs <= 30);
      case 'LOW_CALORIE':  return list.filter(r => r.calories <= 400);
      default:             return list;
    }
  }, [baseRecipes, searchQuery, activeFilter]);

  const handleDelete = (id: string) => {
    setMyRecipes(prev => prev.filter(r => r.id !== id));
    setCommunityRecipes(prev => prev.filter(r => r.id !== id));
    setSelectedRecipe(null);
  };

  const handleSaveToLibrary = (recipe: Recipe) => {
    // Refresh my recipes to include the newly saved copy
    api.recipes.getMine().then(setMyRecipes).catch(() => {});
  };

  const isOwnerOfSelected = selectedRecipe
    ? myRecipes.some(r => r.id === selectedRecipe.id)
    : false;

  return (
    <div>
      {/* Tab + Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex bg-gray-200/80 p-1.5 rounded-2xl border border-gray-300/60">
          <button
            onClick={() => setActiveTab('COMMUNITY')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'COMMUNITY'
                ? 'bg-white text-gray-900 shadow-md shadow-black/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Community
          </button>
          <button
            onClick={() => setActiveTab('MINE')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'MINE'
                ? 'bg-white text-gray-900 shadow-md shadow-black/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Collection
          </button>
        </div>

        <button
          onClick={() => setIsBuilderOpen(true)}
          className="bg-primary text-gray-900 font-bold py-3 px-6 rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 border border-primary-dark/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Recipe
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <svg className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search recipes by name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-primary shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as FilterPreset[]).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all ${
                activeFilter === f
                  ? 'bg-primary text-gray-900 border-primary-dark/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
          {filteredRecipes.length !== baseRecipes.length && (
            <span className="text-xs text-gray-400 self-center ml-1">
              {filteredRecipes.length} of {baseRecipes.length} recipes
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {searchQuery || activeFilter !== 'ALL' ? 'No matching recipes' : 'No recipes found'}
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto text-sm">
            {searchQuery
              ? `No recipes match "${searchQuery}". Try a different search term.`
              : activeFilter !== 'ALL'
              ? 'Try a different filter.'
              : activeTab === 'COMMUNITY'
              ? 'Check back later for new community recipes.'
              : "You haven't created any recipes yet. Click the button above to get started!"}
          </p>
          {(searchQuery || activeFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
              className="mt-4 text-sm text-primary-dark font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isOwner={activeTab === 'MINE'}
              onDelete={handleDelete}
              onClick={setSelectedRecipe}
            />
          ))}
        </div>
      )}

      {/* Recipe Builder */}
      <RecipeBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={fetchRecipes}
      />

      {/* Recipe Detail */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        isOwner={isOwnerOfSelected}
        onClose={() => setSelectedRecipe(null)}
        onDelete={handleDelete}
        onSaveToLibrary={handleSaveToLibrary}
      />
    </div>
  );
};
