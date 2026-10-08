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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
