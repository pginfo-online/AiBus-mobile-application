import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { BookingResponseData } from '../../types/api';

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
  };
  gstDetails?: {
    gstin: string;
    gstCompany: string;
  };
  passengers: Array<{
    seatNo: string;
    seatTypeId: number;
    fare: number;
    gender: 'M' | 'F';
    age: number;
    name: string;
    isAcSeat: boolean;
  }>;
}

export interface CreateBookingPayload {
  holdId: string;
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
    gender: 'M' | 'F';
    age: number;
    name: string;
    isAcSeat: boolean;
  }>;
  cancellationPolicy?: any;
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

export function useUserBookingsQuery(enabled = true) {
  return useQuery<BookingResponseData[]>({
    queryKey: ['bookings', 'my-bookings'],
    queryFn: async () => {
      const res = await apiClient.get('/bookings/my-bookings');
      return res.data?.data || [];
    },
    staleTime: 30 * 1000,
    enabled,
  });
}
