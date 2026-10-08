import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { BusSearchResultItem } from '../../types/api';

export interface BusSearchFilterOptions {
  fromCityId: number;
  toCityId: number;
  journeyDate: string; // YYYY-MM-DD
  isAC?: boolean;
  isSleeper?: boolean;
  operator?: string;
  sortBy?: 'fare_asc' | 'fare_desc' | 'departure_asc' | 'departure_desc' | 'duration_asc';
  minFare?: number;
  maxFare?: number;
}

export function useBusesQuery(filters: BusSearchFilterOptions) {
  return useQuery<{ results: BusSearchResultItem[]; total: number }>({
    queryKey: ['buses', filters],
    queryFn: async ({ signal }) => {
      const params: Record<string, string | number | boolean> = {
        fromCityId: filters.fromCityId,
        toCityId: filters.toCityId,
        journeyDate: filters.journeyDate,
      };

      if (filters.isAC !== undefined) params.isAC = filters.isAC;
      if (filters.isSleeper !== undefined) params.isSleeper = filters.isSleeper;
      if (filters.operator) params.operator = filters.operator;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.minFare !== undefined) params.minFare = filters.minFare;
      if (filters.maxFare !== undefined) params.maxFare = filters.maxFare;

      const res = await apiClient.get('/search', { params, signal });
      return res.data?.data || { results: [], total: 0 };
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: Boolean(filters.fromCityId && filters.toCityId && filters.journeyDate),
  });
}
