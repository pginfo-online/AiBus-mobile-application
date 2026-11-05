import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CityItem } from '../../types/api';

export function useCitiesQuery(query?: string) {
  const trimmed = query?.trim();

  return useQuery<CityItem[]>({
    queryKey: ['cities', { q: trimmed?.toLowerCase() || '' }],
    queryFn: async ({ signal }) => {
      // Use strictly bounded query parameters to eliminate heavy data transfer
      const params = trimmed
        ? { q: trimmed, limit: 20 }
        : { popular: true, limit: 15 };

      const res = await apiClient.get<{ data: CityItem[] }>('/cities', { params, signal });
      return res.data.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
