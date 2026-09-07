import { apiClient } from './client';

export interface RecruiterCandidate {
  id: string;
  name: string;
  role: string;
  headline?: string;
  location: string;
  experienceLevel: string;
  yearsExperience?: string;
  avatarInitials: string;
  avatarGradient: string;
  skills: string[];
  assessmentName?: string;
  assessmentScore: number;
  assessmentPercentile?: string;
  atsScore: number;
  jobMatch: number;
  isShortlisted: boolean;
  interviewStage?: string;
  bio?: string;
  experienceYears?: number;
  verifiedGithub?: string;
  verifiedLinkedin?: string;
  questionsSolved?: number;
  totalQuestions?: number;
  accuracy?: number;
  streak?: number;
  projectsCount?: number;
  featuredProjects?: string[];
  targetRole?: string;
  careerGrowthMetric?: string;
  privacy?: {
    searchStatus?: 'actively_looking' | 'casually_browsing' | 'not_looking';
    showSalary?: boolean;
    salaryExpectation?: string;
    contactVisibility?: 'all_recruiters' | 'mutual_matches' | 'hidden';
    email?: string;
    phone?: string;
    cloakedFromCurrentEmployer?: boolean;
  };
}

export interface RecruiterMetrics {
  jobsPosted: number;
  applicationsCount: number;
  shortlistedCount: number;
  interviewsCount: number;
  hiredCount: number;
}

export const recruiterApi = {
  /**
   * Fetch recruiter top dashboard performance metrics
   */
  getRecruiterMetrics: async (): Promise<RecruiterMetrics> => {
    const res = await apiClient.get<RecruiterMetrics>('/recruiter/metrics');
    return res.data;
  },

  /**
   * Search candidate discovery pool with 6-parameter filters
   */
  searchCandidates: async (filters?: {
    role?: string;
    skills?: string;
    experience?: string;
    location?: string;
    minAssessmentScore?: number;
    minJobMatch?: number;
  }): Promise<RecruiterCandidate[]> => {
    const res = await apiClient.get<RecruiterCandidate[]>('/recruiter/candidates', { params: filters });
    return res.data;
  },

  /**
   * Fetch candidate dossier by ID
   */
  getCandidateById: async (id: string): Promise<RecruiterCandidate | null> => {
    const res = await apiClient.get<RecruiterCandidate>(`/recruiter/candidates/${id}`);
    return res.data;
  },

  /**
   * Toggle candidate shortlist status
   */
  toggleShortlistCandidate: async (candidateId: string): Promise<{ isShortlisted: boolean }> => {
    const res = await apiClient.post<{ isShortlisted: boolean }>(`/recruiter/candidates/${candidateId}/shortlist`);
    return res.data;
  },

  /**
   * Download / stream candidate's verified resume with server-side privacy authorization
   */
  downloadCandidateResume: async (candidateId: string, candidateName: string): Promise<void> => {
    try {
      const response = await apiClient.get(`/recruiter/candidates/${candidateId}/resume`, {
        responseType: 'blob',
      });
      const contentType = typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Verified_Resume_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.response?.status === 403) {
        throw new Error('Access denied. Candidate resume is restricted by candidate privacy directives or employer cloaking.');
      } else if (err.response?.status === 404) {
        throw new Error('Candidate or resume document not found.');
      }
      throw new Error(err.message || 'Failed to download candidate resume.');
    }
  },
};

export default recruiterApi;
