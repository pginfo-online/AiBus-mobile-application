import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CouponItem } from '../../types/api';
import { FALLBACK_OFFERS } from './fallbackOffers';

export { FALLBACK_OFFERS };

export function useOffersQuery(category?: string) {
  return useQuery<CouponItem[]>({
    queryKey: ['coupons', { category: category || 'All' }],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/coupons');
        const items = res.data?.data?.items || res.data?.data;
        if (Array.isArray(items) && items.length > 0) {
          const list: CouponItem[] = items.map((c: any) => ({
            id: c.id,
            code: c.code,
            category: c.category || 'Bus',
            title: c.title || c.description,
            subtitle: c.subtitle || '',
            type: c.type,
            value: Number(c.value),
            maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
            minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
            discountBadge: c.discountBadge || `${c.value}% OFF`,
            validUntil: c.validUntil,
            formattedExpiry: c.formattedExpiry || 'Valid till: 31 Oct',
            description: c.description || c.title,
            termsAndConditions: Array.isArray(c.termsAndConditions) ? c.termsAndConditions : [],
            bannerImageUrl: c.bannerImageUrl,
          }));

          if (category && category !== 'All') {
            return list.filter((item) => item.category.toLowerCase() === category.toLowerCase());
          }
          return list;
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          throw err;
        }
      }

      // Fallback
      if (category && category !== 'All') {
        return FALLBACK_OFFERS.filter((item) => item.category.toLowerCase() === category.toLowerCase());
      }
      return FALLBACK_OFFERS;
    },
    initialData: category && category !== 'All'
      ? FALLBACK_OFFERS.filter((item) => item.category.toLowerCase() === category.toLowerCase())
      : FALLBACK_OFFERS,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOfferDetailsQuery(code?: string) {
  const normalized = code?.trim().toUpperCase();

  return useQuery<CouponItem>({
    queryKey: ['coupons', normalized],
    queryFn: async () => {
      if (!normalized) throw new Error('Coupon code required');

      try {
        const res = await apiClient.get(`/coupons/${normalized}`);
        const c = res.data?.data;
        if (c) {
          return {
            id: c.id,
            code: c.code,
            category: c.category || 'Bus',
            title: c.title || c.description,
            subtitle: c.subtitle || '',
            type: c.type,
            value: Number(c.value),
            maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
            minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
            discountBadge: c.discountBadge || `${c.value}% OFF`,
            validUntil: c.validUntil,
            formattedExpiry: c.formattedExpiry || 'Valid till: 31 Oct',
            description: c.description || c.title,
            termsAndConditions: Array.isArray(c.termsAndConditions) ? c.termsAndConditions : [],
            bannerImageUrl: c.bannerImageUrl,
          };
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          throw err;
        }
      }

      const match = FALLBACK_OFFERS.find((o) => o.code.toUpperCase() === normalized);
      if (match) return match;

      throw new Error(`Coupon '${normalized}' not found`);
    },
    enabled: Boolean(normalized),
    staleTime: 5 * 60 * 1000,
  });
}
