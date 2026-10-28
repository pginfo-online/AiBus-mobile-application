import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CityItem } from '../../types/api';

// Curated popular cities in India matching live GDS provider IDs & reference UI
export const POPULAR_CITIES: CityItem[] = [
  { id: 'c-blr', providerCityId: 4292, name: 'Bengaluru' },
  { id: 'c-chn', providerCityId: 4562, name: 'Chennai' },
  { id: 'c-hyd', providerCityId: 5215, name: 'Hyderabad' },
  { id: 'c-pun', providerCityId: 6772, name: 'Pune' },
  { id: 'c-mum', providerCityId: 2001, name: 'Mumbai' },
  { id: 'c-del', providerCityId: 1001, name: 'Delhi' },
  { id: 'c-cbe', providerCityId: 3002, name: 'Coimbatore' },
  { id: 'c-vjw', providerCityId: 4563, name: 'Vijayawada' },
  { id: 'c-vsk', providerCityId: 4564, name: 'Visakhapatnam' },
  { id: 'c-ahm', providerCityId: 5002, name: 'Ahmedabad' },
  { id: 'c-try', providerCityId: 3004, name: 'Tiruchirapalli' },
  { id: 'c-jai', providerCityId: 1002, name: 'Jaipur' },
  { id: 'c-goa', providerCityId: 5001, name: 'Goa' },
];

export function useCitiesQuery(query?: string) {
  const trimmed = query?.trim();

  return useQuery<CityItem[]>({
    queryKey: ['cities', { q: trimmed?.toLowerCase() || '' }],
    queryFn: async ({ signal }) => {
      // Use strictly bounded query parameters to eliminate heavy data transfer
      const params = trimmed
        ? { q: trimmed, limit: 20 }
        : { popular: true, limit: 15 };

      try {
        const res = await apiClient.get('/cities', { params, signal });
        const apiCities = res.data?.data;
        if (Array.isArray(apiCities) && apiCities.length > 0) {
          return apiCities.map((c: any) => ({
            id: String(c.id || c.providerCityId || c.CityId),
            providerCityId: Number(c.providerCityId || c.CityId || c.id),
            name: c.name || c.CityName || c.City,
          }));
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          throw err;
        }
      }

      // Instant fast client-side fallback
      if (trimmed) {
        const q = trimmed.toLowerCase();
        return POPULAR_CITIES.filter((c) =>
          c.name.toLowerCase().includes(q)
        );
      }
      return POPULAR_CITIES;
    },
    // Instant initial data for empty queries to eliminate UI latency completely
    initialData: !trimmed ? POPULAR_CITIES : undefined,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
