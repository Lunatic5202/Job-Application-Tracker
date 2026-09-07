import { apiClient } from './client';
import { JobItem, JobFilterState } from '../types';

export const jobApi = {
  /**
   * Fetch job listings with optional multi-facet filters
   */
  getJobs: async (filters?: Partial<JobFilterState>): Promise<JobItem[]> => {
    const res = await apiClient.get<JobItem[]>('/jobs', { params: filters });
    return res.data;
  },

  /**
   * Fetch single job details by ID
   */
  getJobById: async (id: string): Promise<JobItem | null> => {
    const res = await apiClient.get<JobItem>(`/jobs/${id}`);
    return res.data;
  },

  /**
   * Analyze candidate resume compatibility against specific job description
   */
  getJobMatchAnalysis: async (
    jobId: string
  ): Promise<{ matchScore: number; matchedSkills: string[]; missingSkills: string[]; recommendations: string[] }> => {
    const res = await apiClient.post<{
      matchScore: number;
      matchedSkills: string[];
      missingSkills: string[];
      recommendations: string[];
    }>(`/jobs/${jobId}/match`);
    return res.data;
  },
};

export default jobApi;
