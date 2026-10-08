import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { SeatChartResponseData } from '../../types/api';

export function useSeatChartQuery(busId?: number) {
  return useQuery<SeatChartResponseData>({
    queryKey: ['seats', 'chart', busId],
    queryFn: async () => {
      if (!busId) throw new Error('busId is required');
      const res = await apiClient.get(`/buses/${busId}/chart`);
      return res.data?.data;
    },
    staleTime: 30 * 1000, // 30 seconds freshness for live seat charts
    enabled: Boolean(busId),
  });
}
