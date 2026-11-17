import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../core/api/client";
import { useAuthStore } from "../../stores/authStore";
import { TicketResponseData } from "../../types/api";
import { ticketPollingInterval } from "../booking/bookingLifecycle";
export function useTicketQuery(bookingId?: string | null) {
  const owner = useAuthStore((s) => s.user?.id);
  return useQuery<TicketResponseData>({
    queryKey: ["tickets", "booking", bookingId, owner],
    enabled: Boolean(bookingId && owner),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get(
          `/tickets/booking/${encodeURIComponent(bookingId!)}`,
          { signal },
        )
      ).data.data,
    refetchInterval: (query) => query.state.data ? ticketPollingInterval(query.state.data.booking.status, query.state.dataUpdateCount) : false,
    staleTime: 30000,
    gcTime: 900000,
    refetchOnReconnect: true,
  });
}
