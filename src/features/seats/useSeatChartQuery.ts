import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { SeatChartResponseData } from '../../types/api';

interface SeatChartQueryParams {
  fromCityId: number;
  toCityId: number;
  journeyDate: string;
}

export function useSeatChartQuery(busId: number | undefined, params: SeatChartQueryParams) {
  return useQuery<SeatChartResponseData>({
    queryKey: ['seats', 'chart-v2', busId, params.fromCityId, params.toCityId, params.journeyDate],
    queryFn: async () => {
      if (!busId) throw new Error('busId is required');
      const res = await apiClient.get(`/buses/${busId}/chart`, {
        params: {
          fromCityId: params.fromCityId,
          toCityId: params.toCityId,
          journeyDate: `${params.journeyDate}T00:00:00.000Z`,
        },
      });
      return res.data?.data;
    },
    staleTime: 30 * 1000, // 30 seconds freshness for live seat charts
    enabled: Boolean(busId && params.fromCityId && params.toCityId && params.journeyDate),
  });
}
