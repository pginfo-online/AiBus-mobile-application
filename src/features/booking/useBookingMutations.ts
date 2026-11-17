import { useAuthStore } from '../../stores/authStore';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { BookingResponseData } from '../../types/api';
import { PaymentIntentResponse, PaymentGatewayType, PaymentModeType } from '../payments/usePaymentMutations';

export interface HoldSeatsPayload {
  fromCityId: number;
  toCityId: number;
  journeyDate: string;
  busId: number;
  pickupId: string;
  dropoffId: string;
  contactInfo: {
    customerName: string;
    email: string;
    phone: string;
    mobile: string;
    state?: string;
  };
  gstDetails?: {
    gstin: string;
    gstCompany: string;
    businessAddress?: string;
    email?: string;
  };
  passengers: Array<{
    seatNo: string;
    seatTypeId: number;
    fare: number;
    gender: 'M' | 'F' | 'O';
    age: number;
    name: string;
    isAcSeat: boolean;
  }>;
}

export interface CreateBookingPayload {
  holdId?: string;
  fromCityId: number;
  toCityId: number;
  fromCityName: string;
  toCityName: string;
  journeyDate: string;
  busId: number;
  tripId: string;
  pickupCode: string;
  pickupLocation: string;
  pickupTime: string;
  dropoffCode: string;
  dropoffLocation: string;
  dropoffTime: string;
  operatorName: string;
  busType: string;
  totalFare: number;
  baseFare: number;
  serviceTax: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  passengers: Array<{
    seatNo: string;
    seatTypeId: number;
    fare: number;
    gender: 'M' | 'F' | 'O';
    age: number;
    name: string;
    isAcSeat: boolean;
  }>;
  cancellationPolicy?: any;
  pickupSnapshot?: unknown;
  dropoffSnapshot?: unknown;
  couponCode?: string;
  useWallet?: boolean;
}

export interface CreateCheckoutSessionPayload extends CreateBookingPayload {
  gateway?: PaymentGatewayType;
  paymentMode?: PaymentModeType;
  redirectUrl?: string;
}

export interface CheckoutSessionResponse {
  booking: BookingResponseData;
  paymentIntent: PaymentIntentResponse | null;
}

export function useHoldSeatsMutation() {
  return useMutation({
    mutationFn: async (payload: HoldSeatsPayload) => {
      const res = await apiClient.post('/holds', payload);
      return res.data?.data;
    },
  });
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const res = await apiClient.post('/bookings', payload);
      return res.data?.data as BookingResponseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
    },
  });
}

export function useCreateCheckoutSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCheckoutSessionPayload) => {
      const res = await apiClient.post('/bookings/checkout-session', payload);
      return res.data?.data as CheckoutSessionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-bookings'] });
    },
  });
}

export function useBookingDetailsQuery(bookingId?: string | null) {
  return useQuery<BookingResponseData>({
    queryKey: ['bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('bookingId required');
      const res = await apiClient.get(`/bookings/${bookingId}`);
      return res.data?.data;
    },
    enabled: Boolean(bookingId),
  });
}

export function useBookingStatusQuery(bookingId?: string | null, enabled = true, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ['bookings', 'status', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('bookingId required');
      const res = await apiClient.get(`/bookings/${bookingId}/status`);
      return res.data?.data;
    },
    enabled: Boolean(bookingId) && enabled,
    refetchInterval,
  });
}

export function useUserBookingsQuery(enabled = true, filter: 'UPCOMING' | 'PAST_TRIPS' | 'CANCELLED' = 'UPCOMING') {
  const owner = useAuthStore((s) => s.user?.id);
  const query = useInfiniteQuery({
    queryKey: ['bookings', 'my-bookings', owner, filter], enabled: enabled && Boolean(owner),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }): Promise<{ items: BookingResponseData[]; nextCursor: string | null }> => {
      const res = await apiClient.get('/bookings/my-bookings', { params: { limit: 20, cursor: pageParam, filter }, signal });
      return res.data.data;
    },
    getNextPageParam: (last) => last.nextCursor || undefined,
    staleTime: 30000, gcTime: 600000, refetchOnReconnect: true,
  });
  const data = query.data?.pages.flatMap((page) => page.items).filter((item, index, all) => all.findIndex((b) => b.id === item.id) === index);
  return { ...query, data };
}
