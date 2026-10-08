import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AppConfig } from '../config/env';
import { SecureTokenStorage } from '../storage';
import { normalizeError, DomainError } from '../errors';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Singleton Axios Instance with Request Tracing, Secure Auth Injection,
 * Mutex-locked Token Refresh, and Domain Error Normalization.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: AppConfig.apiBaseUrl,
  timeout: AppConfig.requestTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Mutex lock for token refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach Auth & Request ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Generate unique request ID for distributed tracing
    config.headers['X-Request-Id'] = generateUuid();

    // Attach Bearer Access Token if present
    const token = await SecureTokenStorage.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(normalizeError(error));
  }
);

// 2. Response Interceptor: Handle Token Refresh & Normalize Errors
apiClient.interceptors.response.use(
  (response) => {
    // Return the response data directly if encapsulated in standard { success: true, data }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest?._retry) {
      // If the 401 came from login or refresh endpoint itself, do not retry
      if (originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')) {
        return Promise.reject(normalizeError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(normalizeError(err));
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await SecureTokenStorage.getRefreshToken();
        if (!storedRefreshToken) {
          throw new DomainError({
            category: 'AUTHENTICATION',
            code: 'AUTH_EXPIRED',
            message: 'Session expired',
          });
        }

        // Call refresh endpoint directly using raw axios to avoid loop
        const refreshResponse = await axios.post(`${AppConfig.apiBaseUrl}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newTokens = refreshResponse.data?.data;
        if (newTokens?.accessToken) {
          await SecureTokenStorage.setAccessToken(newTokens.accessToken);
          if (newTokens.refreshToken) {
            await SecureTokenStorage.setRefreshToken(newTokens.refreshToken);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

          processQueue(null, newTokens.accessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Malformed token response');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await SecureTokenStorage.clearTokens();
        return Promise.reject(normalizeError(refreshErr));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

export default apiClient;
