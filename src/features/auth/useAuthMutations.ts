import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../stores/authStore';

export interface SendOtpPayload {
  phone: string;
  appHash?: string;
}

export interface SendOtpResponse {
  phone: string;
  otpLength: number;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  debugOtp?: string;
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthSuccessResponse {
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
}

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: async (payload: SendOtpPayload): Promise<SendOtpResponse> => {
      const res = await apiClient.post('/auth/otp/send', payload);
      return res.data?.data;
    },
  });
}

export function useVerifyOtpMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VerifyOtpPayload): Promise<AuthSuccessResponse> => {
      const res = await apiClient.post('/auth/otp/verify', payload);
      return res.data?.data;
    },
    onSuccess: async (data) => {
      if (data?.user && data?.tokens) {
        await setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      }
    },
  });
}

// Deprecated fallback mutations for email/password retained for backward-compatibility
export interface LoginPayload {
  email: string;
  password: string;
}

export function useLoginMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await apiClient.post('/auth/login', payload);
      return res.data?.data;
    },
    onSuccess: async (data) => {
      if (data?.user && data?.tokens) {
        await setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      }
    },
  });
}
