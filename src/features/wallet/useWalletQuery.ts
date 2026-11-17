import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { WalletResponseData } from '../../types/api';

export function useWalletQuery(enabled = true) {
  const owner = useAuthStore((s) => s.user?.id);
  return useQuery<WalletResponseData>({
    queryKey: ['user', 'wallet', owner],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get('/users/wallet', { signal });
      return res.data?.data;
    },
    enabled: enabled && Boolean(owner),
    staleTime: 30 * 1000,
  });
}
