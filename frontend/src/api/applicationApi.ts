import { apiClient } from './client';
import { Application } from '../types';

export const applicationApi = {
  /**
   * Fetch all tracked job applications with optional status filter
   */
  getApplications: async (status?: string): Promise<Application[]> => {
    const params = status && status !== 'All' ? { status } : {};
    const res = await apiClient.get<Application[]>('/applications', { params });
    return res.data;
  },

  /**
   * Fetch a single application by ID
   */
  getApplicationById: async (id: string): Promise<Application | null> => {
    const res = await apiClient.get<Application>(`/applications/${id}`);
    return res.data;
  },

  /**
   * Submit a new job application record
   */
  createApplication: async (data: Partial<Application>): Promise<Application> => {
    const res = await apiClient.post<Application>('/applications', data);
    return res.data;
  },

  /**
   * Update an existing application's stage, priority, or notes
   */
  updateApplication: async (id: string, data: Partial<Application>): Promise<Application> => {
    const res = await apiClient.patch<Application>(`/applications/${id}`, data);
    return res.data;
  },

  /**
   * Delete an application record
   */
  deleteApplication: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/applications/${id}`);
    return res.data;
  },
};

export default applicationApi;
