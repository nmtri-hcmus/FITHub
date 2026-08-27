import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { BackendSubCommunity } from '../../lib/api';

export const CommunityShortcutsApp: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<BackendSubCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchShortcuts = async () => {
      try {
        const token = localStorage.getItem('fithub_token');
        if (!token) {
          setLoading(false);
          return;
        }
        const data = await api.community.getMySubCommunities();
        setShortcuts(data);
      } catch (err) {
        console.error('Failed to load shortcuts:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchShortcuts();
  }, []);

  if (loading) {
    return <div className="px-3 text-xs text-text-subtle">Loading shortcuts...</div>;
  }

  if (error || shortcuts.length === 0) {
    return (
      <div className="px-3 text-xs text-text-subtle">
        You haven't joined any sub-communities yet. Explore the Community to find your tribe!
      </div>
    );
  }

  return (
    <nav className="space-y-1 animate-fadeIn">
      {shortcuts.map(group => (
        <a
          key={group.id}
          href={`/community?groupId=${group.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-bold text-sm text-text-muted hover:bg-gray-800 hover:text-white"
        >
          <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs uppercase">
            {group.name.charAt(0)}
          </span>
          {group.name}
        </a>
      ))}
    </nav>
  );
};

