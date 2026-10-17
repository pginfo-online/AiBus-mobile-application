import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { TicketResponseData } from '../../types/api';

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
      // If ticket is not yet confirmed/issued, poll every 1500ms
      if (!data || !data.ticketNumber || data.status !== 'ISSUED') {
        return 1500;
      }
      return false; // Stop polling once ticket is confirmed and ISSUED
    },
    staleTime: 60 * 1000,
  });
}
