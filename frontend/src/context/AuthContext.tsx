import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, RoleType, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: RoleType;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: RoleType) => Promise<void>;
  toggleRole: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authApi.getCurrentUser());
  const [token, setToken] = useState<string | null>(() => authApi.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    try {
      const storedToken = authApi.getToken();
      const storedUser = authApi.getCurrentUser();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      } else {
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = () => setError(null);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register(data);
      setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: RoleType) => {
    if (!token || !user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.switchRole(newRole);
      setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch role';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = async () => {
    const currentRole = user?.role || 'seeker';
    const nextRole: RoleType = currentRole === 'seeker' ? 'recruiter' : 'seeker';
    await switchRole(nextRole);
  };

  const role: RoleType = user?.role || 'seeker';
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        toggleRole,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
