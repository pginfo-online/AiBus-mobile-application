import { create } from 'zustand';
import { SecureTokenStorage } from '../core/storage';
import { apiClient } from '../core/api/client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  walletBalance: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken?: string) => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureTokenStorage.setAccessToken(accessToken);
    if (refreshToken) {
      await SecureTokenStorage.setRefreshToken(refreshToken);
    }
    set({ user, isAuthenticated: true });
  },

  updateUser: (updatedFields) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updatedFields } });
    }
  },

  logout: async () => {
    try {
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      await SecureTokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  bootstrapAuth: async () => {
    set({ isBootstrapping: true });
    try {
      const token = await SecureTokenStorage.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isBootstrapping: false });
        return;
      }

      const res = await apiClient.get('/users/profile');
      if (res.data?.success && res.data?.data) {
        set({ user: res.data.data, isAuthenticated: true, isBootstrapping: false });
      } else {
        set({ user: null, isAuthenticated: false, isBootstrapping: false });
      }
    } catch {
      // Token might be expired or invalid
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },
}));
