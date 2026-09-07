import { apiClient } from './client';

export type PostType =
  | 'Achievement'
  | 'Project'
  | 'Certification'
  | 'Learning Update'
  | 'Career Advice'
  | 'Technical Discussion'
  | 'Job Announcement'
  | 'Architecture'
  | 'Interview'
  | 'Offer'
  | 'SystemDesign'
  | 'General'
  | 'Question';

export interface FeedComment {
  id: string;
  authorName: string;
  authorHeadline: string;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: {
    name: string;
    headline: string;
    avatarInitials: string;
    company?: string;
    isVerified: boolean;
  };
  type: PostType;
  createdAt: string;
  content: string;
  tags: string[];
  codeSnippet?: string;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  isSaved: boolean;
  sharesCount: number;
  comments: FeedComment[];
}

export const postApi = {
  /**
   * Fetch social engineering posts with optional category filter
   */
  getPosts: async (category?: PostType | 'All'): Promise<FeedPost[]> => {
    const params = category && category !== 'All' ? { category } : {};
    const res = await apiClient.get<FeedPost[]>('/posts', { params });
    return res.data;
  },

  /**
   * Publish a new post to the technical social feed
   */
  createPost: async (postData: Partial<FeedPost>): Promise<FeedPost> => {
    const res = await apiClient.post<FeedPost>('/posts', postData);
    return res.data;
  },

  /**
   * Like or unlike a post
   */
  likePost: async (postId: string): Promise<{ likesCount: number; isLiked: boolean }> => {
    const res = await apiClient.post<{ likesCount: number; isLiked: boolean }>(`/posts/${postId}/like`);
    return res.data;
  },

  /**
   * Add a comment to an engineering thread
   */
  addComment: async (postId: string, content: string): Promise<FeedComment> => {
    const res = await apiClient.post<FeedComment>(`/posts/${postId}/comments`, { content });
    return res.data;
  },

  /**
   * Save or unsave a post to bookmarks
   */
  bookmarkPost: async (postId: string): Promise<{ isSaved: boolean }> => {
    const res = await apiClient.post<{ isSaved: boolean }>(`/posts/${postId}/bookmark`);
    return res.data;
  },
};

export default postApi;
