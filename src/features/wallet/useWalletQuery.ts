import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { WalletResponseData } from '../../types/api';

export function useWalletQuery(enabled = true) {
  return useQuery<WalletResponseData>({
    queryKey: ['user', 'wallet'],
    queryFn: async () => {
      const res = await apiClient.get('/users/wallet');
      return res.data?.data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}
