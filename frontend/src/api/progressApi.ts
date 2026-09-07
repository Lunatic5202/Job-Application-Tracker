import { apiClient } from './client';

export interface ProgressOverview {
  questionsSolved: number;
  totalQuestions: number;
  accuracy: number;
  codingStreakDays: number;
  currentAtsScore: number;
  projectsCompleted: number;
  certificationsCount: number;
}

export interface ActivityDataPoint {
  period: string;
  studyHours: number;
  questionsSolved: number;
  streakDays: number;
}

export interface SkillTrajectory {
  name: string;
  initialScore: number;
  currentScore: number;
  growthPercentage: number;
}

export const progressApi = {
  /**
   * Fetch aggregate career progress statistics
   */
  getProgressOverview: async (): Promise<ProgressOverview> => {
    const res = await apiClient.get<ProgressOverview>('/progress/overview');
    return res.data;
  },

  /**
   * Fetch activity history breakdown (daily, weekly, or monthly)
   */
  getActivityHistory: async (range: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ActivityDataPoint[]> => {
    const res = await apiClient.get<ActivityDataPoint[]>('/progress/activity', { params: { range } });
    return res.data;
  },

  /**
   * Fetch skill trajectory growth metrics
   */
  getSkillTrajectories: async (): Promise<SkillTrajectory[]> => {
    const res = await apiClient.get<SkillTrajectory[]>('/progress/skills');
    return res.data;
  },
};

export default progressApi;
