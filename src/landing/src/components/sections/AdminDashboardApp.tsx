import React, { useState, useEffect } from 'react';
import { api, type BackendCoachApplication, type Recipe } from '../../lib/api';

// ── Badge counts ───────────────────────────────────────────────────────────────
const TabBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="bg-surface border border-surface-edge/60 text-xs px-2 py-0.5 rounded-full text-white ml-1">
    {count}
  </span>
);

// ── Empty placeholder ───────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="bg-[#1e1f26] border border-surface-edge rounded-b-3xl p-16 text-center shadow-xl">
    <span className="text-5xl">{icon}</span>
    <p className="text-white font-bold text-lg mt-4">{title}</p>
    <p className="text-text-muted text-sm mt-1">{desc}</p>
  </div>
);

// ── Coach Application Card ──────────────────────────────────────────────────────
const CoachCard: React.FC<{
  app: BackendCoachApplication;
  onResolve: (id: string, approve: boolean) => void;
  loading: boolean;
}> = ({ app, onResolve, loading }) => (
  <div className="bg-[#1e1f26] border border-surface-edge hover:border-surface-edge/80 rounded-3xl p-6 transition-all space-y-6 shadow-lg">
    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center font-black text-lg">
          {app.user?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{app.user?.name}</h3>
          <p className="text-xs text-text-muted">{app.user?.email}</p>
        </div>
      </div>
      <div>
        <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Monthly Rate</span>
        <span className="text-xl font-extrabold text-white">${app.hourlyRate}<span className="text-text-subtle font-normal text-xs">/mo</span></span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-surface-edge/30 text-sm">
      <div>
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Specialty</span>
        <p className="text-white font-semibold">{app.specialty}</p>
      </div>
      <div>
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Bio</span>
        <p className="text-text-subtle leading-relaxed">{app.bio || 'No biography provided.'}</p>
      </div>
    </div>

    <div className="bg-surface rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-surface-edge/60">
      <div>
        <span className="text-xs text-text-muted block mb-2 font-medium">Government-issued ID</span>
        <a href={app.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
          📄 View ID Document →
        </a>
      </div>
      <div>
        <span className="text-xs text-text-muted block mb-2 font-medium">Training Certifications</span>
        <a href={app.certDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
          📜 View Certificate →
        </a>
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-4 border-t border-surface-edge/30">
      <button
        disabled={loading}
        onClick={() => onResolve(app.id, false)}
        className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-red-500/20 transition-all disabled:opacity-50"
      >
        ✕ Decline
      </button>
      <button
        disabled={loading}
        onClick={() => onResolve(app.id, true)}
        className="bg-primary text-surface font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-light transition-all disabled:opacity-50"
      >
        ✓ Approve & Verify
      </button>
    </div>
  </div>
);

// ── Recipe Submission Card ──────────────────────────────────────────────────────
const RecipeCard: React.FC<{
  recipe: Recipe;
  onResolve: (id: string, approve: boolean) => void;
  loading: boolean;
}> = ({ recipe, onResolve, loading }) => (
  <div className="bg-[#1e1f26] border border-surface-edge hover:border-surface-edge/80 rounded-3xl p-6 transition-all space-y-6 shadow-lg">
    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <h3 className="text-xl font-bold text-white">{recipe.recipeName}</h3>
        <p className="text-xs text-text-muted mt-1">
          Submitted by: <span className="text-white font-medium">{recipe.user?.name ?? 'User'}</span>
          {recipe.user?.email ? <> · {recipe.user.email}</> : null}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs shrink-0 w-full sm:w-auto">
        {[
          { label: 'Calories', val: `${recipe.calories}`, unit: 'kcal', color: 'text-white' },
          { label: 'Protein', val: `${recipe.protein}`, unit: 'g', color: 'text-blue-400' },
          { label: 'Carbs', val: `${recipe.carbs}`, unit: 'g', color: 'text-amber-400' },
          { label: 'Fat', val: `${recipe.fat}`, unit: 'g', color: 'text-rose-400' },
        ].map(m => (
          <div key={m.label} className="bg-surface rounded-xl px-3 py-1.5 border border-surface-edge/60">
            <p className="text-[10px] text-text-muted uppercase mb-0.5">{m.label}</p>
            <p className={`font-bold ${m.color}`}>{m.val}<span className="text-text-disabled font-normal ml-0.5">{m.unit}</span></p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-surface-edge/30 text-sm">
      <div>
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Ingredients</span>
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ing: any) => (
            <li key={ing.id} className="flex justify-between border-b border-surface-edge/30 pb-1 text-xs">
              <span className="text-white font-medium">{ing.ingredientName}</span>
              <span className="text-text-subtle font-mono">{ing.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Instructions</span>
        <p className="text-text-subtle leading-relaxed whitespace-pre-line text-xs">{recipe.instructions}</p>
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-4 border-t border-surface-edge/30">
      <button
        disabled={loading}
        onClick={() => onResolve(recipe.id, false)}
        className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-red-500/20 transition-all disabled:opacity-50"
      >
        ✕ Decline Submission
      </button>
      <button
        disabled={loading}
        onClick={() => onResolve(recipe.id, true)}
        className="bg-primary text-surface font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary-light transition-all disabled:opacity-50"
      >
        ✓ Approve & Publish
      </button>
    </div>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────────
export const AdminDashboardApp: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'coaches' | 'recipes'>('coaches');

  const [coachApps, setCoachApps] = useState<BackendCoachApplication[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);

  const [recipeApps, setRecipeApps] = useState<Recipe[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [apps, recipes] = await Promise.all([
        api.coaches.getApplications().catch((): BackendCoachApplication[] => []),
        api.recipes.getPending().catch((): Recipe[] => []),
      ]);
      setCoachApps(apps);
      setRecipeApps(recipes);
    } catch (err: any) {
      setError(err.message || 'Failed to load moderator data.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('fithub_token');
    const userStr = localStorage.getItem('fithub_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') {
          setIsAdmin(true);
          loadData().finally(() => setLoading(false));
          return;
        }
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const handleResolveCoach = async (appId: string, approve: boolean) => {
    setCoachLoading(true);
    setError(null);
    try {
      await api.coaches.resolveApplication(appId, approve);
      await loadData();
      alert(`✓ Coach application ${approve ? 'Approved' : 'Declined'} successfully!`);
    } catch (err: any) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleResolveRecipe = async (recipeId: string, approve: boolean) => {
    setRecipeLoading(true);
    setError(null);
    try {
      await api.recipes.moderate(recipeId, approve);
      await loadData();
      alert(`✓ Recipe ${approve ? 'Approved and published' : 'Declined'} successfully!`);
    } catch (err: any) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setRecipeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#13141c] text-white flex flex-col items-center justify-center gap-6 px-4 py-20">
        <span className="text-6xl">🚫</span>
        <h1 className="text-3xl font-extrabold text-center">Access Denied</h1>
        <p className="text-text-subtle text-center max-w-md">
          Only FITHub Administrators and Moderators can access this dashboard.
        </p>
        <a
          href="/"
          className="bg-primary text-surface font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all text-sm"
        >
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13141c] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-0">

        {/* Header */}
        <div className="border-b border-surface-edge/60 pb-6 mb-6">
          <h1 className="text-3xl font-extrabold font-mono tracking-tight text-primary">MODERATOR DASHBOARD</h1>
          <p className="text-text-muted text-sm mt-1">Review pending coach verifications and community recipe submissions.</p>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-[#1e1f26] rounded-t-3xl border border-surface-edge border-b-0 overflow-hidden">
          <button
            onClick={() => setActiveTab('coaches')}
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'coaches'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-text-muted hover:text-white'
            }`}
          >
            🎓 Coach Verifications
            <TabBadge count={coachApps.length} />
          </button>
          <div className="w-px bg-surface-edge" />
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'recipes'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-text-muted hover:text-white'
            }`}
          >
            🥗 Recipe Submissions
            <TabBadge count={recipeApps.length} />
          </button>
        </div>

        {/* Tab 1: Coach Applications */}
        {activeTab === 'coaches' && coachApps.length === 0 && (
          <EmptyState icon="🎓" title="No Pending Coach Applications" desc="All applications have been verified." />
        )}
        {activeTab === 'coaches' && coachApps.length > 0 && (
          <div className="space-y-6 pt-6">
            {coachApps.map(app => (
              <CoachCard key={app.id} app={app} onResolve={handleResolveCoach} loading={coachLoading} />
            ))}
          </div>
        )}

        {/* Tab 2: Recipe Submissions */}
        {activeTab === 'recipes' && recipeApps.length === 0 && (
          <EmptyState icon="🥗" title="No Pending Recipes" desc="All community submissions have been moderated." />
        )}
        {activeTab === 'recipes' && recipeApps.length > 0 && (
          <div className="space-y-6 pt-6">
            {recipeApps.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onResolve={handleResolveRecipe} loading={recipeLoading} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
