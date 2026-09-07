import { apiClient } from './client';
import { AtsBreakdown } from '../types';

export interface PillarMetric {
  title: string;
  weight: string;
  score: number;
  status: 'optimal' | 'good' | 'warning' | 'critical';
  summary: string;
}

export interface MissingKeyword {
  name: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  category: string;
}

export interface BulletImprovement {
  id: string;
  section: string;
  original: string;
  optimized: string;
  rationale: string;
  scoreImpact: string;
}

export interface ResumeAnalysisResult {
  id?: string;
  userId?: string;
  resumeId?: string;
  atsScore: number;
  targetRole?: string;
  targetProfile?: string;
  percentile?: number;
  atsBreakdown: AtsBreakdown;
  pillars?: PillarMetric[];
  strengths: string[];
  weaknesses: string[];
  optimizationAreas?: string[];
  missingKeywords: Array<MissingKeyword | string>;
  keywords?: Array<MissingKeyword | string>;
  hardSkills?: string[];
  extractedSkills?: Record<string, string[]>;
  bulletImprovements?: BulletImprovement[];
  experienceRewrites?: BulletImprovement[];
  projects?: any[];
  education?: any[];
  formattingRecommendations?: string[];
  skillGaps: string[];
  recommendations: string[];
  rawTextSnippet?: string;
  isAiGenerated?: boolean;
  analyzedAt?: string;
  createdAt?: string;
}

export interface ResumeListItem {
  id: string;
  userId?: string;
  name?: string;
  filename?: string;
  originalFilename?: string;
  format?: string;
  size?: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  uploadDate?: string;
  uploadedAt?: string;
  createdAt?: string;
  atsScore?: number;
  latestAnalysisId?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

export const resumeApi = {
  /**
   * Upload resume document (PDF / DOCX) for parsing & Groq ATS analysis
   */
  uploadResume: async (
    formData: FormData,
    signal?: AbortSignal
  ): Promise<{ id: string; filename: string; size: string; fileUrl?: string; atsScore?: number }> => {
    const res = await apiClient.post<{ id: string; filename: string; size: string; fileUrl?: string; atsScore?: number }>(
      '/resumes/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      }
    );
    return res.data;
  },

  /**
   * Run full AI-powered ATS resume parsing and rubric evaluation with Groq
   */
  analyzeResume: async (
    params?: { resumeId?: string; resumeText?: string; jobDescription?: string },
    signal?: AbortSignal
  ): Promise<ResumeAnalysisResult> => {
    if (params?.resumeId) {
      const res = await apiClient.post<ResumeAnalysisResult>(
        `/resumes/${params.resumeId}/analyze`,
        {
          jobDescription: params.jobDescription,
        },
        { signal }
      );
      return res.data;
    }
    const res = await apiClient.post<ResumeAnalysisResult>('/resumes/analyze', params || {}, { signal });
    return res.data;
  },

  /**
   * Get cached latest resume analysis results for user
   */
  getResumeAnalysis: async (signal?: AbortSignal): Promise<ResumeAnalysisResult | null> => {
    const res = await apiClient.get<ResumeAnalysisResult | null>('/resumes/analysis', { signal });
    return res.data || null;
  },

  /**
   * Get analysis for a specific resume belonging to authenticated user
   */
  getResumeAnalysisByResumeId: async (resumeId: string, signal?: AbortSignal): Promise<ResumeAnalysisResult | null> => {
    const res = await apiClient.get<ResumeAnalysisResult | null>(`/resumes/${resumeId}/analysis`, { signal });
    return res.data || null;
  },

  /**
   * Set active resume for user
   */
  setActiveResume: async (resumeId: string, signal?: AbortSignal): Promise<ResumeListItem> => {
    const res = await apiClient.patch<ResumeListItem>(`/resumes/${resumeId}/active`, {}, { signal });
    return res.data;
  },

  /**
   * Delete resume for authenticated user
   */
  deleteResume: async (resumeId: string, signal?: AbortSignal): Promise<boolean> => {
    await apiClient.delete(`/resumes/${resumeId}`, { signal });
    return true;
  },

  /**
   * List user's uploaded resumes
   */
  listResumes: async (signal?: AbortSignal): Promise<ResumeListItem[]> => {
    const res = await apiClient.get<ResumeListItem[]>('/resumes', { signal });
    return res.data || [];
  },

  /**
   * Get active resume for current user
   */
  getActiveResume: async (signal?: AbortSignal): Promise<ResumeListItem | null> => {
    const res = await apiClient.get<ResumeListItem | null>('/resumes/active', { signal });
    return res.data || null;
  },
};

export default resumeApi;
