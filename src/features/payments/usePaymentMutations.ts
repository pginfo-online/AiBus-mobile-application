import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { BookingResponseData } from '../../types/api';

export interface PaymentIntentResponse {
  paymentId: string;
  merchantTxnId: string;
  amount: number;
  currency: string;
  gateway: string;
  paymentUrl: string;
}

export interface VerifyPaymentPayload {
  bookingId: string;
  merchantTxnId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
}

export interface VerifyPaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  payment: {
    id: string;
    status: string;
  };
  booking: BookingResponseData;
}

export function useCreatePaymentIntentMutation() {
  return useMutation<PaymentIntentResponse, Error, { bookingId: string; gateway?: string }>({
    mutationFn: async ({ bookingId, gateway = 'PHONEPE' }) => {
      const res = await apiClient.post('/payments/intent', {
        bookingId,
        gateway,
      });
      return res.data?.data;
    },
  });
}

export function useVerifyPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/payments/verify', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', data.booking.id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'booking', data.booking.id] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}
