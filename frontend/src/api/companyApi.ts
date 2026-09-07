import { apiClient } from './client';
import { CompanyProfile } from '../types/company';
import { JobItem } from '../types';

export const companyApi = {
  /**
   * Fetch partner technology companies with optional keyword filtering
   */
  getCompanies: async (query?: string): Promise<CompanyProfile[]> => {
    const res = await apiClient.get<CompanyProfile[]>('/companies', { params: { query } });
    return res.data;
  },

  /**
   * Dynamically discover and synthesize real company dossiers & jobs using Groq LLM
   */
  discoverWithAi: async (params: {
    industry?: string;
    query?: string;
    companyName?: string;
    count?: number;
  }): Promise<CompanyProfile[]> => {
    const res = await apiClient.post<CompanyProfile[]>('/companies/ai-discover', params);
    return res.data;
  },

  /**
   * Fetch company dossier by slug or ID
   */
  getCompanyBySlug: async (slugOrId: string): Promise<CompanyProfile | null> => {
    const res = await apiClient.get<CompanyProfile>(`/companies/${slugOrId}`);
    return res.data;
  },

  /**
   * Fetch open engineering jobs for a company
   */
  getCompanyJobs: async (companyId: string): Promise<JobItem[]> => {
    const res = await apiClient.get<JobItem[]>(`/companies/${companyId}/jobs`);
    return res.data;
  },

  /**
   * Toggle follow/following status for a company
   */
  toggleFollowCompany: async (
    companyId: string
  ): Promise<{ isFollowing: boolean; followersCount: number }> => {
    const res = await apiClient.post<{ isFollowing: boolean; followersCount: number }>(`/companies/${companyId}/follow`);
    return res.data;
  },
};

export default companyApi;

