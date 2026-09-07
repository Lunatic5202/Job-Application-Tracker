import apiClient from './client';

export interface UpcomingInterviewItem {
  id: string;
  company: string;
  role: string;
  date: string;
  status: string;
  urgency?: string;
  link?: string;
}

export interface UpcomingDeadlineItem {
  id: string;
  company: string;
  role: string;
  deadline: string;
  status: string;
  urgency?: string;
}

export interface ApplicationMetrics {
  total: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  wishlist: number;
}

export interface LearningProgressSummary {
  questionsSolved: number;
  totalQuestions: number;
  accuracy: number;
  streakDays: number;
}

export interface UserProfileOverview {
  id: string;
  name: string;
  headline?: string;
  atsScore?: number;
  skills: string[];
}

export interface DashboardOverviewResponse {
  profile: UserProfileOverview;
  applications: ApplicationMetrics;
  upcomingInterviews: UpcomingInterviewItem[];
  upcomingDeadlines: UpcomingDeadlineItem[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  connectionRequestsCount: number;
  savedJobsCount: number;
  learningProgress?: LearningProgressSummary | null;
}

export interface DashboardActivityItem {
  id: string;
  type: 'application' | 'message' | 'notification' | 'connection' | 'feed';
  title: string;
  subtitle?: string;
  timestamp: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface DashboardActivityResponse {
  items: DashboardActivityItem[];
  total: number;
}

export const dashboardApi = {
  getOverview: async (signal?: AbortSignal): Promise<DashboardOverviewResponse> => {
    const res = await apiClient.get<DashboardOverviewResponse>('/dashboard/overview', { signal });
    return res.data;
  },

  getActivity: async (limit: number = 20, signal?: AbortSignal): Promise<DashboardActivityResponse> => {
    const res = await apiClient.get<DashboardActivityResponse>('/dashboard/activity', {
      params: { limit },
      signal,
    });
    return res.data;
  },
};

export default dashboardApi;
