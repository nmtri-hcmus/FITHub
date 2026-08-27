import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { BackendPost } from '../../lib/api';

import challengesSvg from '../../assets/challenges.svg?raw';
import searchSvg from '../../assets/search.svg?raw';
import upvoteSvg from '../../assets/upvote.svg?raw';
import shareSvg from '../../assets/share.svg?raw';
import forumCommentSvg from '../../assets/forum.comment.svg?raw';

const TOPICS = ['All Topics', 'Q&A', 'Nutrition', 'Workouts', 'Verified Coach Answers'];

export const CommunityFeedApp: React.FC = () => {
  const initialView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'vote' ? 'vote_meal' : 'feed';
  const [activeView, setActiveView] = useState<'feed' | 'vote_meal'>(initialView);
  const [posts, setPosts] = useState<BackendPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState('All Topics');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [authorToReport, setAuthorToReport] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);

  const groupId = new URLSearchParams(window.location.search).get('groupId') || undefined;

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.community.getPosts(groupId);
      setPosts(data);

      if (groupId) {
        const groups = await api.community.getSubCommunities();
        const active = groups.find((g: any) => g.id === groupId);
        if (active) {
          const localBanner = localStorage.getItem(`fithub_group_banner_${active.id}`);
          setActiveGroup({ ...active, bannerUrl: localBanner || undefined });
        }
      } else {
        setActiveGroup(null);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full w-full max-w-7xl mx-auto">
      {/* Center Column: Feed */}
      <div className="flex-1 border-r border-surface-edge min-h-screen">
        {activeView === 'vote_meal' ? (
          <VoteMealView onBack={() => setActiveView('feed')} />
        ) : (
          <>
        {/* Page header Ă¢â‚¬â€ Forum title OR Sub-Community banner */}
        {activeGroup ? (
          /* Sub-Community Banner */
          <div className="relative h-48 w-full bg-gray-800 overflow-hidden flex flex-col justify-end">
            <img
              src={activeGroup.bannerUrl || `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200&auto=format&fit=crop`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 flex justify-between items-end p-6">
              <div>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-wider">Sub-Community</span>
                <h2 className="text-2xl font-black text-white leading-tight mb-1">
                  f/{activeGroup.name}
                </h2>
                <p className="text-white/80 text-xs font-medium line-clamp-1 max-w-lg">{activeGroup.description}</p>
              </div>
              <button
                onClick={() => window.location.href = '/community'}
                className="bg-surface/10 hover:bg-surface/20 text-white border border-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Ă¢â€ Â Back to Feed
              </button>
            </div>
          </div>
          ) : (
            /* General Forum Header replaced with Vote Banner */
            <div 
              onClick={() => setActiveView('vote_meal')}
              className="px-6 py-6 border-b border-surface-edge bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer text-white flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl bg-surface/20 flex items-center justify-center text-white shrink-0 [&>svg]:w-6 [&>svg]:h-6"
                  dangerouslySetInnerHTML={{ __html: challengesSvg }}
                />
                <div>
                  <h1 className="text-xl font-black leading-tight text-white">Vote for best meal of the week!</h1>
                  <p className="text-xs font-medium text-emerald-100">Click here to vote on community recipes and help decide the winner.</p>
                </div>
              </div>
              <span className="text-xl font-bold">â”</span>
            </div>
          )}

        {/* Header Area */}
        <div className="px-6 pb-6 pt-2 border-b border-surface-edge bg-surface sticky top-[65px] z-20 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-text-subtle [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block pointer-events-none"
                dangerouslySetInnerHTML={{ __html: searchSvg }}
              />
              <input
                type="text"
                placeholder="Search topics or questions..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-edge border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              + New Post
            </button>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
            {TOPICS.map(topic => (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border
                  ${activeTopic === topic
                    ? 'bg-black text-white border-black'
                    : 'bg-surface text-text-muted border-surface-edge hover:bg-surface-alt'}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Area */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-surface border border-surface-edge rounded-2xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">Ä‘Å¸Å’Â±</div>
              <h3 className="text-lg font-bold text-white mb-2">No discussions found</h3>
              <p className="text-text-muted mb-6 text-sm">
                {activeGroup
                  ? 'No approved posts yet. Posts submitted here need admin approval before appearing.'
                  : 'Be the first to start a conversation in this category!'}
              </p>
              <button
                onClick={() => setIsComposeOpen(true)}
                className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-800"
              >
                Start a Discussion
              </button>
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onReport={() => { setAuthorToReport(post.authorId); setIsReportOpen(true); }}
              />
            ))
          )}
        </div>
        </>
        )}
      </div>

      {/* Right Column: Contextual Sidebar */}
      <div className="hidden lg:block w-80 shrink-0 p-6">
        <div className="bg-surface border border-surface-edge rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Popular Topics</h3>
          <div className="space-y-3">
            {['#MealPrepSunday', '#FormCheck', '#BeginnerGains'].map(tag => (
              <a key={tag} href="#" className="block text-sm font-semibold text-gray-300 hover:text-emerald-600 transition-colors">
                {tag}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-surface-edge rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Featured Coaches</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=CoachAlex`} alt="Avatar" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Alex Jenkins</p>
                <p className="text-xs text-text-muted">Strength &amp; Conditioning</p>
              </div>
            </div>
          </div>
        </div>

        {activeGroup && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm mt-6">
            <h3 className="font-bold text-emerald-400 mb-2 text-sm">Ä‘Å¸â€œÅ’ Posting in this group</h3>
            <p className="text-xs text-emerald-400">Posts in <strong>{activeGroup.name}</strong> are reviewed by admins before they appear publicly.</p>
          </div>
        )}
      </div>

      {/* Overlays */}
      {isComposeOpen && (
        <ComposeSlideboard
          onClose={() => setIsComposeOpen(false)}
          onPostCreated={loadPosts}
          groupId={groupId}
          groupName={activeGroup?.name}
        />
      )}
      {isReportOpen && <ReportModal onClose={() => setIsReportOpen(false)} authorId={authorToReport} />}
    </div>
  );
};

const PostCard: React.FC<{ post: BackendPost; onReport: () => void }> = ({ post, onReport }) => {
  const isCoach = post.user.role === 'COACH' || post.user.role === 'ADMIN';
  const postImage = localStorage.getItem(`fithub_post_metadata_${post.id}`);
  const localUpvotes = parseInt(localStorage.getItem(`fithub_post_up_${post.id}`) || '0');
  const localDownvotes = parseInt(localStorage.getItem(`fithub_post_down_${post.id}`) || '0');
  const [upvotes, setUpvotes] = React.useState(localUpvotes);
  const [downvotes, setDownvotes] = React.useState(localDownvotes);
  const [myVote, setMyVote] = React.useState<'up' | 'down' | null>(null);

  const [showComments, setShowComments] = React.useState(false);
  const [comments, setComments] = React.useState<any[]>(post.comments || []);
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [commentCount, setCommentCount] = React.useState(post._count?.comments || 0);

  const toggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      if (comments.length === 0 && commentCount > 0) {
        setLoadingComments(true);
        try {
          const details = await api.community.getPostDetails(post.id);
          if (details.comments) {
            setComments(details.comments);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingComments(false);
        }
      }
    } else {
      setShowComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.community.createComment(post.id, newComment);
      const details = await api.community.getPostDetails(post.id);
      if (details.comments) {
        setComments(details.comments);
        setCommentCount(details.comments.length);
      }
      setNewComment('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVote = (type: 'up' | 'down') => {
    if (myVote === type) return; // already voted
    if (type === 'up') {
      const nu = upvotes + 1;
      const nd = myVote === 'down' ? downvotes - 1 : downvotes;
      setUpvotes(nu); setDownvotes(nd);
      localStorage.setItem(`fithub_post_up_${post.id}`, nu.toString());
    } else {
      const nd = downvotes + 1;
      const nu = myVote === 'up' ? upvotes - 1 : upvotes;
      setDownvotes(nd); setUpvotes(nu);
      localStorage.setItem(`fithub_post_down_${post.id}`, nd.toString());
    }
    setMyVote(type);
  };

  const score = upvotes - downvotes;

  return (
    <div className="bg-surface border border-surface-edge rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-edge overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.id}`} alt="Avatar" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{post.user.name}</span>
              {post.user.role === 'ADMIN' ? (
                <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide">
                  Admin
                </span>
              ) : post.user.role === 'COACH' ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide">
                  Verified Coach
                </span>
              ) : (
                <span className="bg-surface-edge text-text-muted text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wide">
                  Trainee
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-subtle">
                {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {post.subCommunity && (
                <a
                  href={`/community?groupId=${post.subCommunity.id}`}
                  className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  f/{post.subCommunity.name}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white mb-1">{post.title}</h2>
        <p className="text-gray-300 text-sm leading-relaxed">{post.content}</p>
        {postImage && (
          <img src={postImage} className="w-full max-h-96 object-cover rounded-xl mt-3 border border-surface-edge" />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-edge">
        <div className="flex items-center gap-3">
          {/* Vote pill */}
          <div className="flex items-center bg-surface-edge rounded-full overflow-hidden border border-surface-edge">
            <button
              onClick={() => handleVote('up')}
              className={`px-3 py-1.5 flex items-center transition-colors ${myVote === 'up' ? 'text-emerald-600 bg-emerald-500/10' : 'text-text-muted hover:bg-gray-800'}`}
            >
              <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block" dangerouslySetInnerHTML={{ __html: upvoteSvg }} />
            </button>
            <span className={`font-black text-sm px-2 min-w-[28px] text-center ${score > 0 ? 'text-emerald-600' : score < 0 ? 'text-red-500' : 'text-text-muted'}`}>
              {score}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`px-3 py-1.5 flex items-center transition-colors ${myVote === 'down' ? 'text-red-500 bg-red-500/10' : 'text-text-muted hover:bg-gray-800'}`}
            >
              {/* Flipped upvote = downvote */}
              <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block rotate-180" dangerouslySetInnerHTML={{ __html: upvoteSvg }} />
            </button>
          </div>
          <button 
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-semibold"
          >
            <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block" dangerouslySetInnerHTML={{ __html: forumCommentSvg }} />
            {commentCount}
          </button>
          <button className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-semibold">
            <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 [&>svg]:block" dangerouslySetInnerHTML={{ __html: shareSvg }} />
            Share
          </button>
        </div>
        <button onClick={onReport} className="text-text-subtle hover:text-red-500 text-sm font-medium transition-colors">
          Report
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-surface-edge">
          {loadingComments ? (
            <p className="text-sm text-text-muted text-center py-2">Loading comments...</p>
          ) : (
            <div className="space-y-4 mb-4 max-h-80 overflow-y-auto pr-2">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-edge overflow-hidden shrink-0">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} alt="Avatar" />
                  </div>
                  <div className="flex-1 bg-surface-alt rounded-2xl p-3 border border-surface-edge">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{comment.user?.name || 'User'}</span>
                      {comment.user?.role === 'ADMIN' ? (
                        <span className="bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wide">
                          Admin
                        </span>
                      ) : comment.user?.role === 'COACH' ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wide">
                          Verified Coach
                        </span>
                      ) : (
                        <span className="bg-gray-800 text-gray-300 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wide">
                          Trainee
                        </span>
                      )}
                      <span className="text-[10px] text-text-subtle ml-auto">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">No comments yet. Be the first!</p>
              )}
            </div>
          )}
          
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 bg-surface-alt border border-surface-edge rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-emerald-600 transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const ComposeSlideboard: React.FC<{
  onClose: () => void;
  onPostCreated: () => void;
  groupId?: string;
  groupName?: string;
}> = ({ onClose, onPostCreated, groupId, groupName }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('Q&A');
  const [isAnon, setIsAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImageUrl(compressedUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title || !content) return;
    setSubmitting(true);
    try {
      const newPost = await api.community.createPost({ title, content, subCommunityId: groupId });
      if (imageUrl) {
        try {
          localStorage.setItem(`fithub_post_metadata_${newPost.id}`, imageUrl);
        } catch (storageErr) {
          console.warn('Could not save image (quota limit):', storageErr);
        }
      }
      onPostCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col animate-fadeInRight">
        <div className="p-4 border-b border-surface-edge flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Create Post</h2>
            {groupName && (
              <p className="text-xs text-emerald-600 font-bold mt-0.5">Ä‘Å¸â€œÅ’ Posting in: {groupName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-subtle hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {groupName && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              Ă¢ÂÂ³ Posts in sub-communities are reviewed by admins before appearing publicly.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Topic Category</label>
            <select
              value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full p-3 bg-surface-alt border border-surface-edge rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              {TOPICS.filter(t => t !== 'All Topics').map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Title</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="What's on your mind?"
              className="w-full p-3 bg-surface-alt border border-surface-edge rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Body</label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)} placeholder="Share your thoughts, ask a question, or post a form check..."
              rows={6}
              className="w-full p-3 bg-surface-alt border border-surface-edge rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Attach Image (Optional)</label>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            {imageUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-surface-edge">
                <img src={imageUrl} className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 text-lg font-bold"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-700 rounded-xl p-8 text-center text-text-muted text-sm hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              >
                Ä‘Å¸â€œÂ¸ Drag &amp; drop or click to upload
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-surface-edge bg-surface-alt flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500" />
            <span className="text-sm font-medium text-gray-300">Post Anonymously</span>
          </label>
          <button
            onClick={handleSubmit} disabled={submitting || !title || !content}
            className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Posting...' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportModal: React.FC<{ onClose: () => void; authorId: string | null }> = ({ onClose, authorId }) => {
  const categories = ['Spam', 'Harassment', 'Misinformation', 'Unsafe Practice'];
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected || !authorId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.admin.createReport(authorId, selected);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {done ? (
          /* Success state */
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">Ă¢Å“â€¦</div>
            <h2 className="text-lg font-black text-white mb-2">Report Submitted</h2>
            <p className="text-sm text-text-muted mb-6">
              Our moderation team will review this report shortly. Thank you for keeping FITHub safe.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-surface-edge">
              <h2 className="text-lg font-black text-white">Report Post</h2>
              <p className="text-xs text-text-subtle mt-0.5">Select the reason for reporting this post.</p>
            </div>
            <div className="p-5 space-y-2">
              {categories.map(cat => (
                <label key={cat} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${selected === cat ? 'border-red-300 bg-red-500/10' : 'border-transparent hover:bg-surface-alt hover:border-surface-edge'}`}>
                  <input
                    type="radio"
                    name="report"
                    value={cat}
                    checked={selected === cat}
                    onChange={() => setSelected(cat)}
                    className="text-red-500 focus:ring-red-400"
                  />
                  <span className="text-sm font-medium text-gray-200">{cat}</span>
                </label>
              ))}
              {error && (
                <p className="text-xs text-red-500 font-medium pt-1 px-1">{error}</p>
              )}
            </div>
            <div className="p-5 bg-surface-alt flex justify-end gap-3 border-t border-surface-edge">
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-text-muted hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-black text-white disabled:opacity-50 hover:bg-gray-800 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const VoteMealView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [recipes, setRecipes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [votes, setVotes] = React.useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    api.recipes.getApproved().then(data => {
      setRecipes(data);
      const v: Record<string, number> = {};
      const hV: Record<string, boolean> = {};

      const suitableImages: Record<string, string> = {
        'Spicy Honey Garlic Salmon': 'https://images.unsplash.com/photo-1467003909585-2f8aa5cd9f56?auto=format&fit=crop&w=800&q=80',
        'Creamy Tuscan Chicken': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
        'Avocado Egg Toast': 'https://images.unsplash.com/photo-1525351484163-7929051c9101?auto=format&fit=crop&w=800&q=80',
        'Protein Packed Oatmeal': 'https://images.unsplash.com/photo-1517673132405-a56a62723862?auto=format&fit=crop&w=800&q=80',
        'Steak and Sweet Potato Meal Prep': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
        'Greek Yogurt Parfait': 'https://images.unsplash.com/photo-1488477181943-685b881cb513?auto=format&fit=crop&w=800&q=80',
        'Turkey Meatballs & Zucchini Noodles': 'https://images.unsplash.com/photo-1529692236671-f1f6d3f23a50?auto=format&fit=crop&w=800&q=80',
        'Peanut Butter Banana Smoothie': 'https://images.unsplash.com/photo-1553530666-4c4be672e399?auto=format&fit=crop&w=800&q=80',
        'Shrimp Tacos with Slaw': 'https://images.unsplash.com/photo-1565299585323-b18413a96860?auto=format&fit=crop&w=800&q=80',
        'Chicken Pesto Pasta': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
        'Quinoa Salad Bowl': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        'Cottage Cheese Pancakes': 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?auto=format&fit=crop&w=800&q=80',
        'Teriyaki Tofu Stir-fry': 'https://images.unsplash.com/photo-1512058564366-18510fd2b15e?auto=format&fit=crop&w=800&q=80',
        'Tuna Salad Stuffed Peppers': 'https://images.unsplash.com/photo-1603094892708-360e5015b6b1?auto=format&fit=crop&w=800&q=80',
        'Keto Cheeseburger Bowl': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'
      };

      data.forEach((r: any) => {
        if (!localStorage.getItem('fithub_recipe_image_' + r.id) && suitableImages[r.recipeName]) {
          localStorage.setItem('fithub_recipe_image_' + r.id, suitableImages[r.recipeName]);
        }
        v[r.id] = parseInt(localStorage.getItem('fithub_meal_vote_' + r.id) || '0');
        hV[r.id] = localStorage.getItem('fithub_meal_voted_' + r.id) === 'true';
      });
      setVotes(v);
      setHasVoted(hV);
      setLoading(false);
    });
  }, []);

  const handleVote = (id: string) => {
    if (hasVoted[id]) return; // Constraint: Only vote once
    const current = votes[id] || 0;
    const newCount = current + 1;
    localStorage.setItem('fithub_meal_vote_' + id, newCount.toString());
    localStorage.setItem('fithub_meal_voted_' + id, 'true');
    setVotes(prev => ({ ...prev, [id]: newCount }));
    setHasVoted(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="p-6 animate-fadeIn">
      <button onClick={onBack} className="text-sm font-bold text-text-muted hover:text-white mb-6">Ă¢â€ Â Back to Forum</button>
      <h2 className="text-3xl font-black mb-2">Vote for Best Meal of the Week</h2>
      <p className="text-text-muted mb-8">Support your fellow community members by voting for the most delicious and nutritious meal!</p>
      
      {loading ? (
        <div className="p-12 text-center text-text-subtle">Loading...</div>
      ) : recipes.length === 0 ? (
        <div className="p-12 text-center bg-surface-alt rounded-2xl">No recipes submitted this week.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map(recipe => (
            <div key={recipe.id} className="bg-surface border border-surface-edge rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <div className="h-48 bg-surface-edge relative">
                {localStorage.getItem('fithub_recipe_image_' + recipe.id) ? (
                  <img src={localStorage.getItem('fithub_recipe_image_' + recipe.id)!} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">Ä‘Å¸ÂÂ²</div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1 text-white">{recipe.recipeName}</h3>
                <p className="text-xs text-text-muted mb-4 line-clamp-2">{recipe.instructions}</p>
                <div className="flex gap-3 text-xs font-bold text-text-muted mb-4">
                  <span>Ä‘Å¸â€Â¥ {recipe.calories} kcal</span>
                  <span>Ä‘Å¸Â¥Â© {recipe.protein}g</span>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">{votes[recipe.id] || 0} Votes</span>
                  <button 
                    onClick={() => handleVote(recipe.id)} 
                    disabled={hasVoted[recipe.id]}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                      hasVoted[recipe.id] 
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {hasVoted[recipe.id] ? 'Ă¢Å“â€œ Voted' : 'Ä‘Å¸â€˜Â Vote'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};







