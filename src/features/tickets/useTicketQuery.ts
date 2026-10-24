import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { TicketResponseData } from '../../types/api';

/**
 * Hook to retrieve confirmed ticket details for a given booking.
 * Optimized with generous caching and strict polling guards:
 * - Never polls for completed, confirmed, issued, or cancelled tickets.
 * - Only polls for transient in-progress booking confirmations.
 */
export function useTicketQuery(bookingId?: string | null) {
  return useQuery<TicketResponseData>({
    queryKey: ['tickets', 'booking', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('bookingId required');
      const res = await apiClient.get(`/tickets/booking/${bookingId}`);
      return res.data?.data;
    },
    enabled: Boolean(bookingId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      // Check both top-level and booking-level statuses
      const status = (data.status || data.booking?.status || '').toUpperCase();
      const isTransient =
        status === 'PAYMENT_PENDING' ||
        status === 'PAYMENT_SUCCESS' ||
        status === 'BOOKING_REQUESTED' ||
        status === 'PENDING';

      if (isTransient) {
        return 2000; // Snappy 2s check during active post-payment booking confirmation
      }

      // Terminal states (ISSUED, CONFIRMED, CANCELLED, COMPLETED, FAILED): Never poll
      return false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh in memory
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
