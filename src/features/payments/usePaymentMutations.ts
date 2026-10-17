import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { BookingResponseData, TicketResponseData } from '../../types/api';

export type PaymentGatewayType = 'RAZORPAY' | 'PHONEPE' | 'AUTO';
export type PaymentModeType = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'ALL';

export interface CreatePaymentIntentPayload {
  bookingId: string;
  gateway?: PaymentGatewayType;
  paymentMode?: PaymentModeType;
  redirectUrl?: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  merchantTxnId: string;
  amount: number;
  currency: string;
  gateway: 'RAZORPAY' | 'PHONEPE';
  paymentUrl: string;
  upiIntentUrl?: string;
  gatewayOrderId?: string;
  sdkPayload?: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  };
}

export interface VerifyPaymentPayload {
  bookingId: string;
  merchantTxnId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
}

export interface VerifyPaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'BOOKING_FAILED' | 'BOOKING_UNKNOWN';
  message?: string;
  payment: {
    id: string;
    status: string;
    gateway?: string;
    amount?: number;
    gatewayPaymentId?: string;
  };
  booking: BookingResponseData;
  ticket?: TicketResponseData;
}

export function useCreatePaymentIntentMutation() {
  return useMutation<PaymentIntentResponse, Error, CreatePaymentIntentPayload>({
    mutationFn: async ({
      bookingId,
      gateway = 'RAZORPAY',
      paymentMode = 'ALL',
      redirectUrl,
    }) => {
      const res = await apiClient.post('/payments/intent', {
        bookingId,
        gateway,
        paymentMode,
        redirectUrl,
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
      if (data?.booking?.id) {
        queryClient.invalidateQueries({ queryKey: ['bookings', data.booking.id] });
        queryClient.invalidateQueries({ queryKey: ['tickets', 'booking', data.booking.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}
