import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CityItem } from '../../types/api';

// Popular default cities in India for offline / instant fast fallback
export const POPULAR_CITIES: CityItem[] = [
  { id: 'c-mum', providerCityId: 101, name: 'Mumbai' },
  { id: 'c-pun', providerCityId: 102, name: 'Pune' },
  { id: 'c-blr', providerCityId: 201, name: 'Bangalore' },
  { id: 'c-chn', providerCityId: 202, name: 'Chennai' },
  { id: 'c-hyd', providerCityId: 203, name: 'Hyderabad' },
  { id: 'c-del', providerCityId: 301, name: 'Delhi' },
  { id: 'c-jai', providerCityId: 302, name: 'Jaipur' },
  { id: 'c-goa', providerCityId: 401, name: 'Goa' },
  { id: 'c-ahm', providerCityId: 501, name: 'Ahmedabad' },
  { id: 'c-sur', providerCityId: 502, name: 'Surat' },
  { id: 'c-ind', providerCityId: 601, name: 'Indore' },
  { id: 'c-nag', providerCityId: 602, name: 'Nagpur' },
];

export function useCitiesQuery(query?: string) {
  return useQuery<CityItem[]>({
    queryKey: ['cities', { q: query?.trim().toLowerCase() || '' }],
    queryFn: async ({ signal }) => {
      const trimmed = query?.trim();
      const params = trimmed ? { q: trimmed } : undefined;
      const res = await apiClient.get('/cities', { params, signal });
      const apiCities = res.data?.data;
      if (Array.isArray(apiCities) && apiCities.length > 0) {
        return apiCities;
      }
      // If query is present, filter popular cities fallback
      if (trimmed) {
        return POPULAR_CITIES.filter((c) =>
          c.name.toLowerCase().includes(trimmed.toLowerCase())
        );
      }
      return POPULAR_CITIES;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
