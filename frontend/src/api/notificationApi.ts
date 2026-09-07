import { apiClient } from './client';
import { emitUnreadStateChange } from '../hooks/useUnreadCounts';

export type NotificationCategory =
  | 'interview_reminder'
  | 'application_deadline'
  | 'follow_up'
  | 'message'
  | 'connection_request'
  | 'job_recommendation'
  | 'learning_achievement'
  | 'assessment_score'
  | 'recruiter_message'
  | 'job_alert'
  | 'streak_reminder';

export interface CareerNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  message?: string;
  timestamp?: string;
  createdAt?: string;
  isRead: boolean;
  priority: 'urgent' | 'normal' | 'low';
  company?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export const notificationApi = {
  /**
   * Fetch notifications with optional category filter
   */
  getNotifications: async (category?: NotificationCategory | 'all'): Promise<CareerNotification[]> => {
    const params = category && category !== 'all' ? { category } : {};
    const res = await apiClient.get<CareerNotification[]>('/notifications', { params });
    return res.data;
  },

  /**
   * Mark an individual notification as read
   */
  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
    emitUnreadStateChange();
    return res.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>('/notifications/read-all');
    emitUnreadStateChange();
    return res.data;
  },

  /**
   * Delete a single notification
   */
  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    emitUnreadStateChange();
    return res.data;
  },

  /**
   * Clear all read notifications
   */
  clearRead: async (): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>('/notifications/clear-read');
    emitUnreadStateChange();
    return res.data;
  },
};

export default notificationApi;
