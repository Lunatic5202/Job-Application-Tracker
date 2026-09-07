import { AuthResponse, LoginCredentials, RegisterData, UserProfile, RoleType } from '../types';
import apiClient from './client';
import { clearUserSessionData } from '../utils/userStorage';

const TOKEN_KEY = 'careerx_auth_token';
const USER_KEY = 'careerx_auth_user';

export class AccountNotFoundError extends Error {
  constructor(message = 'No account found for this email address. Please create a new account.') {
    super(message);
    this.name = 'AccountNotFoundError';
  }
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });
      const data = response.data;
      const token = data.token || data.access_token || '';
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return {
        token,
        access_token: data.access_token || token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
    } catch (err: any) {
      if (err.response) {
        const statusCode = err.response.status;
        const msg =
          err.response.data?.message ||
          err.response.data?.detail ||
          'Invalid email or password.';
        if (statusCode === 404 || msg.toLowerCase().includes('no account found') || msg.toLowerCase().includes('not found')) {
          throw new AccountNotFoundError(msg);
        }
        throw new Error(msg);
      }
      throw new Error(err.message || 'Unable to connect to authentication server. Please check your connection.');
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role,
      });
      const resData = response.data;
      const token = resData.token || resData.access_token || '';
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(resData.user));
      return {
        token,
        access_token: resData.access_token || token,
        refresh_token: resData.refresh_token,
        token_type: resData.token_type || 'bearer',
        user: resData.user,
      };
    } catch (err: any) {
      if (err.response) {
        const msg =
          err.response.data?.message ||
          err.response.data?.detail ||
          'Registration failed. Please try again.';
        throw new Error(msg);
      }
      throw new Error(err.message || 'Unable to connect to authentication server.');
    }
  },

  async switchRole(newRole: RoleType): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/switch-role', {
        role: newRole,
      });
      const data = response.data;
      const token = data.token || data.access_token || '';
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return {
        token,
        access_token: data.access_token || token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };
    } catch (err: any) {
      if (err.response) {
        const msg =
          err.response.data?.message ||
          err.response.data?.detail ||
          'Failed to switch role.';
        throw new Error(msg);
      }
      throw new Error(err.message || 'Unable to communicate with role service.');
    }
  },

  async logout(): Promise<void> {
    const currentUser = this.getCurrentUser();
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best effort logout on server
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      clearUserSessionData(currentUser?.id);
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      return res.data;
    } catch (err: any) {
      if (err.response) {
        throw new Error(err.response.data?.message || err.response.data?.detail || 'Unable to process password reset request.');
      }
      throw new Error('Unable to connect to password reset server.');
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/reset-password', {
        token,
        password: newPassword,
      });
      return res.data;
    } catch (err: any) {
      if (err.response) {
        throw new Error(err.response.data?.message || err.response.data?.detail || 'Unable to reset password.');
      }
      throw new Error('Unable to connect to password reset server.');
    }
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>('/auth/me');
    return res.data;
  },

  async refreshToken(): Promise<{ token: string }> {
    const res = await apiClient.post<{ token: string; access_token?: string }>('/auth/refresh');
    const token = res.data.token || res.data.access_token || '';
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    return { token };
  },

  getCurrentUser(): UserProfile | null {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
};

export default authApi;
