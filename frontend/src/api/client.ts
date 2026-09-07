import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  detail?: string | any[];
  timestamp: string;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('careerx_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Unified HTTP Error Handling (401, 403, 404, 422, 500)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 401:
        console.warn('[CareerX API 401] Unauthorized: Session expired or invalid JWT token.');
        // If expired in production, clear token or notify AuthContext
        break;

      case 403:
        console.error('[CareerX API 403] Forbidden: Insufficient permissions for this resource.', data?.message);
        break;

      case 404:
        console.warn('[CareerX API 404] Resource Not Found:', error.config?.url);
        break;

      case 422:
        console.error('[CareerX API 422] FastAPI Validation Error:', data?.detail || data?.message);
        break;

      case 500:
        console.error('[CareerX API 500] Internal Server Error. Please retry later.');
        break;

      default:
        break;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
