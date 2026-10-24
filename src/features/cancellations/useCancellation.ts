import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { CancellationCheckResponse, CancellationResultResponse } from '../../types/api';
import { useAuthStore } from '../../stores/authStore';

export function useCheckCancellabilityQuery(
  bookingId?: string | null,
  seatNos?: string[],
  enabled = true
) {
  const seatParam = seatNos && seatNos.length > 0 ? seatNos.join(',') : undefined;

  return useQuery<CancellationCheckResponse>({
    queryKey: ['cancellations', 'check', bookingId, seatParam],
    queryFn: async () => {
      if (!bookingId) throw new Error('bookingId required');
      const url = seatParam
        ? `/cancellations/${bookingId}/check?seatNos=${encodeURIComponent(seatParam)}`
        : `/cancellations/${bookingId}/check`;
      const res = await apiClient.get(url);
      return res.data?.data;
    },
    enabled: Boolean(bookingId) && enabled,
    staleTime: 10 * 1000,
  });
}

export interface CancelBookingPayload {
  bookingId: string;
  seatNos: string[];
  reason?: string;
  refundToWallet?: boolean;
}

export function useCancelBookingMutation() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: async (payload: CancelBookingPayload) => {
      const res = await apiClient.post(`/cancellations/${payload.bookingId}`, {
        seatNos: payload.seatNos,
        reason: payload.reason,
        refundToWallet: payload.refundToWallet ?? true,
      });
      return res.data?.data as CancellationResultResponse;
    },
    onSuccess: (data, variables) => {
      // 1. If wallet balance was updated, update local auth store immediately
      if (data.newWalletBalance !== undefined && data.newWalletBalance !== null) {
        updateUser({ walletBalance: String(data.newWalletBalance) });
      }

      // 2. Invalidate all booking and ticket queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
    },
  });
}
