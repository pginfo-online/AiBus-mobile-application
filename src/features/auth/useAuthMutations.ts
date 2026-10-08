import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../stores/authStore';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
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

export function useRegisterMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await apiClient.post('/auth/register', payload);
      return res.data?.data;
    },
    onSuccess: async (data) => {
      if (data?.user && data?.tokens) {
        await setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      }
    },
  });
}
