import { apiClient } from './client';
import { UserProfile } from '../types';

export const userApi = {
  /**
   * Fetch user profile (authenticated user or specific userId)
   */
  getProfile: async (userId?: string): Promise<UserProfile> => {
    const url = userId ? `/users/${userId}` : '/users/me';
    const res = await apiClient.get<UserProfile>(url);
    return res.data;
  },

  /**
   * Update profile fields (bio, headline, skills, location)
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await apiClient.patch<UserProfile>('/users/me', data);
    return res.data;
  },

  /**
   * Update recruiter privacy directives & profile visibility
   */
  updatePrivacySettings: async (settings: any): Promise<any> => {
    const res = await apiClient.put<any>('/users/me/privacy', settings);
    return res.data;
  },

  /**
   * Upload user profile avatar photo
   */
  uploadAvatar: async (formData: FormData): Promise<{ avatarUrl: string }> => {
    const res = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export default userApi;
