import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CouponItem } from '../../types/api';
import { FALLBACK_OFFERS } from './fallbackOffers';

export { FALLBACK_OFFERS };

export function useOffersQuery(category?: string) {
  const filter = category === 'All' ? undefined : category;
  return useQuery<CouponItem[]>({
    queryKey: ['coupons', { category: filter }],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ data: CouponItem[] }>('/coupons', {
        params: { category: filter },
        signal,
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOfferDetailsQuery(code?: string) {
  const normalized = code?.trim().toUpperCase();

  return useQuery<CouponItem>({
    queryKey: ['coupons', normalized],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ data: CouponItem }>(
        `/coupons/${encodeURIComponent(normalized ?? '')}`, { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(normalized),
    staleTime: 5 * 60 * 1000,
  });
}
