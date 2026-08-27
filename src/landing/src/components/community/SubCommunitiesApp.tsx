import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { BackendSubCommunity } from '../../lib/api';

const CATEGORIES = ['All', 'Running', 'Hiking', 'Calisthenics', 'Powerlifting', 'Healthy Meal Prep'];

export interface EnrichedGroup extends BackendSubCommunity {
  bannerUrl?: string;
}

export const SubCommunitiesApp: React.FC = () => {
  const [groups, setGroups] = useState<EnrichedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [locationSearch, setLocationSearch] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();

  useEffect(() => {
    loadGroups();
    const user = JSON.parse(localStorage.getItem('fithub_user') || '{}');
    setCurrentUserId(user.id);
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await api.community.getSubCommunities();
      const enriched: EnrichedGroup[] = data.map(group => {
        const localBanner = localStorage.getItem(`fithub_group_banner_${group.id}`);
        return {
          ...group,
          bannerUrl: localBanner || undefined
        };
      });
      setGroups(enriched);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await api.community.joinSubCommunity(id);
      loadGroups(); // Refresh to show 'Joined'
    } catch (err) {
      console.error('Failed to join', err);
      alert('Could not join group');
    }
  };

  const filteredGroups = groups.filter(g => {
    if (activeCategory !== 'All' && !g.name.includes(activeCategory) && !g.description?.includes(activeCategory)) return false;
    if (locationSearch && !g.name.toLowerCase().includes(locationSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 min-h-screen">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-black tracking-tight mb-2">Sub-Communities</h1>
          <p className="text-gray-500 font-medium">Find local workout partners and connect with like-minded athletes.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shrink-0 shadow-lg shadow-black/10"
        >
          + Create New Group
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative w-full lg:w-72 shrink-0">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
          <input 
            type="text" 
            placeholder="Search by City or Region..." 
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm"
          />
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full items-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border
                ${activeCategory === cat 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl">
          <div className="text-4xl mb-4">🌍</div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-500">Try adjusting your filters or create a new group.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGroups.map(group => (
            <GroupCard key={group.id} group={group} onJoin={() => handleJoin(group.id)} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {isCreateOpen && <CreateGroupSlideboard onClose={() => setIsCreateOpen(false)} onCreated={loadGroups} />}
    </div>
  );
};

const GroupCard: React.FC<{ group: EnrichedGroup, onJoin: () => void, currentUserId?: string }> = ({ group, onJoin, currentUserId }) => {
  // If the user created the group, they are inherently joined
  const isJoined = group.createdById === currentUserId; 
  const isPending = group.status === 'PENDING';

  const handleCardClick = (e: React.MouseEvent) => {
    if (isPending) return;
    window.location.href = `/community?groupId=${group.id}`;
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all ${!isPending ? 'cursor-pointer' : ''}`}>
      {/* Header */}
      <div className="h-32 bg-gray-200 relative">
        <img src={group.bannerUrl || `https://images.unsplash.com/photo-1554284126-aa88f22d8b74?q=80&w=800&auto=format&fit=crop&sig=${group.id}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
          <span>📍</span> HCMC, District 1
        </div>
        {isPending && (
          <div className="absolute top-3 right-3 bg-amber-500 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">
            Pending Mod Validation
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight">{group.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{group.description}</p>
        
        <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mb-5">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <span className="text-emerald-500 text-base">👥</span> {group._count?.members || Math.floor(Math.random() * 150) + 12} Members
          </div>
          <div className="flex items-center gap-1.5 text-orange-500">
            <span>🔥</span> Active today
          </div>
        </div>

        {/* Footer */}
        {isJoined ? (
          <button onClick={(e) => e.stopPropagation()} disabled className="w-full bg-black text-white py-3 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <span>✓</span> Joined
          </button>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onJoin(); }}
            disabled={isPending}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-2
              ${isPending 
                ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}
          >
            Join Group
          </button>
        )}
      </div>
    </div>
  );
};

const CreateGroupSlideboard: React.FC<{ onClose: () => void, onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Running');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name || !description) return;
    setSubmitting(true);
    try {
      const newGroup = await api.community.createSubCommunity({ name, description });
      if (imagePreview) {
        localStorage.setItem(`fithub_group_banner_${newGroup.id}`, imagePreview);
      }
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create group. Name might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-fadeInRight">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-black text-black">Create Sub-Community</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
            <span className="text-xl">ℹ️</span>
            <p><strong>Notice:</strong> All sub-community proposals undergo moderator review before going live to the public.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Group Name</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. District 1 Morning Runners"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">City / Region</label>
              <input 
                type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. HCMC"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this group about? Who should join?"
              rows={4}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cover Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl transition-colors cursor-pointer hover:border-emerald-500 hover:bg-emerald-50"
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={e => { e.stopPropagation(); setImagePreview(null); setImageName(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black transition-colors"
                  >
                    ✕
                  </button>
                  <div className="px-3 py-2 text-xs text-gray-500 font-medium truncate border-t border-gray-100">
                    {imageName}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="font-semibold">Click to browse or drag & drop banner</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={handleSubmit} disabled={submitting || !name || !description || !location}
            className="w-full bg-black text-white py-3.5 rounded-xl font-black tracking-wider uppercase hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg shadow-black/10"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};
