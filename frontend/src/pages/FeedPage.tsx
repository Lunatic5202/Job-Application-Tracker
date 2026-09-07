import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LeftProfileSummary } from '../components/feed/LeftProfileSummary';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { RightTrendingSidebar } from '../components/feed/RightTrendingSidebar';
import { postApi, FeedPost, PostType } from '../api/postApi';
import {
  MessageSquare,
  Sparkles,
  Users,
  Search,
  Filter,
  Bookmark,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [feedSearch, setFeedSearch] = useState('');

  const fetchFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await postApi.getPosts();
      setPosts(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to load engineering feed. Please try again.');
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Publish New Post
  const handlePublishPost = async (newPost: FeedPost) => {
    try {
      const created = await postApi.createPost({
        content: newPost.content,
        type: newPost.type,
        tags: newPost.tags,
        codeSnippet: newPost.codeSnippet,
      });
      setPosts((prev) => [created, ...prev]);
    } catch (err) {
      // Optimistically retain created post in list
      setPosts((prev) => [newPost, ...prev]);
    }
  };

  // Like Toggle
  const handleLike = async (postId: string) => {
    try {
      const result = await postApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: result.isLiked, likesCount: result.likesCount }
            : p
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: !p.isLiked,
              likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            };
          }
          return p;
        })
      );
    }
  };

  // Save / Bookmark Toggle
  const handleSave = async (postId: string) => {
    try {
      const result = await postApi.bookmarkPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: result.isSaved } : p))
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
      );
    }
  };

  // Share Increment
  const handleShare = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p))
    );
  };

  // Add Comment
  const handleAddComment = async (postId: string, commentText: string) => {
    try {
      const newComment = await postApi.addComment(postId, commentText);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [newComment, ...p.comments], commentsCount: p.commentsCount + 1 }
            : p
        )
      );
    } catch {
      // no-op if error
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Search
      const q = feedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.content.toLowerCase().includes(q) ||
        p.author?.name?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q));

      // Type or Saved
      let matchesType = true;
      if (selectedType === 'Saved') {
        matchesType = p.isSaved;
      } else if (selectedType !== 'All') {
        matchesType = p.type === selectedType;
      }

      return matchesSearch && matchesType;
    });
  }, [posts, feedSearch, selectedType]);

  const savedCount = useMemo(() => posts.filter((p) => p.isSaved).length, [posts]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Professional Engineering Feed"
        description="Share architectural debriefs, benchmark findings, project milestones, and connect with engineers."
        badge={
          <Badge variant="brand" size="sm">
            Live Discussions
          </Badge>
        }
      />

      {/* ========================================================================= */}
      {/* 3-COLUMN RESPONSIVE LAYOUT (Prioritized for 1366px Laptop & Desktop)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================== LEFT: PROFILE SUMMARY ==================== */}
        <div className="lg:col-span-4 laptop-lg:col-span-3 space-y-4">
          <LeftProfileSummary
            selectedType={selectedType}
            onSelectType={setSelectedType}
            savedCount={savedCount}
          />
          <div className="block laptop-lg:hidden">
            <RightTrendingSidebar />
          </div>
        </div>

        {/* ==================== CENTER: FEED ==================== */}
        <div className="lg:col-span-8 laptop-lg:col-span-6 space-y-4">
          {/* Create Post Composer */}
          <CreatePostCard onPublish={handlePublishPost} />

          {/* Active Filter Indicator if not All */}
          {selectedType !== 'All' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D9D9D9] text-xs shadow-sm">
              <span className="text-[#56687A]">
                Filtered by: <strong className="text-[#0A66C2]">{selectedType}</strong> ({filteredPosts.length} posts)
              </span>
              <button
                onClick={() => setSelectedType('All')}
                className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-semibold"
              >
                Reset Filter
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Feed Posts List */}
          {isLoading ? (
            <div className="p-12 text-center border border-[#E8E8E8] rounded-2xl bg-white flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0A66C2]" />
              <p className="text-xs text-[#56687A]">Loading engineering feed...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No posts found in this category</p>
              <p className="text-xs text-[#56687A]">
                {selectedType === 'Saved'
                  ? 'You have not saved any posts yet.'
                  : 'Be the first to publish a discussion or learning update.'}
              </p>
              <Button size="xs" variant="outline" onClick={() => setSelectedType('All')}>
                View All Posts
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onSave={handleSave}
                  onShare={handleShare}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          )}
        </div>

        {/* ==================== RIGHT: RECOMMENDATIONS / TRENDING ==================== */}
        <div className="hidden laptop-lg:block laptop-lg:col-span-3 space-y-4">
          <RightTrendingSidebar />
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
