import { apiClient } from './client';

export type ConnectionState = 'Connect' | 'Pending' | 'Connected';

export interface NetworkUser {
  id: string;
  name: string;
  role: string;
  headline: string;
  company: string;
  location: string;
  avatarInitials: string;
  avatarGradient: string;
  skills: string[];
  mutualConnections: number;
  connectionState: ConnectionState;
  isIncomingRequest?: boolean;
  requestMessage?: string;
  isFollowing?: boolean;
  connectedDate?: string;
  mutualCount?: number;
  mutualNames?: string[];
  requestDate?: string;
  note?: string;
}

export const connectionApi = {
  /**
   * Fetch 1st-degree connected engineers
   */
  getConnections: async (): Promise<NetworkUser[]> => {
    const res = await apiClient.get<NetworkUser[]>('/network/connections');
    return res.data;
  },

  /**
   * Fetch incoming connection invitations
   */
  getConnectionRequests: async (): Promise<NetworkUser[]> => {
    const res = await apiClient.get<NetworkUser[]>('/network/requests');
    return res.data;
  },

  /**
   * Fetch recommended candidate & engineering peers
   */
  getSuggestedConnections: async (): Promise<NetworkUser[]> => {
    const res = await apiClient.get<NetworkUser[]>('/network/suggestions');
    return res.data;
  },

  /**
   * Fetch all network users
   */
  getNetworkUsers: async (params?: { search?: string; company?: string; skills?: string }): Promise<NetworkUser[]> => {
    const res = await apiClient.get<NetworkUser[]>('/network/users', { params });
    return res.data;
  },

  /**
   * Send connection request to a candidate or recruiter
   */
  sendConnectionRequest: async (userId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/network/connect/${userId}`);
    return res.data;
  },

  /**
   * Accept or ignore an incoming connection request
   */
  respondToConnectionRequest: async (requestId: string, accept: boolean): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/network/requests/${requestId}/respond`, { accept });
    return res.data;
  },

  /**
   * Follow or unfollow a tech leader
   */
  followUser: async (userId: string): Promise<{ following: boolean }> => {
    const res = await apiClient.post<{ following: boolean }>(`/network/follow/${userId}`);
    return res.data;
  },
};

export default connectionApi;
