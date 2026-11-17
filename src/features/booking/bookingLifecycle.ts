export function bookingPhase(status: string) {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "CANCELLATION_REQUESTED") return "cancelling";
  if (["REFUND_PENDING", "REFUNDED"].includes(status)) return "refund";
  if (status === "BOOKING_UNKNOWN") return "uncertain";
  if (["PAYMENT_SUCCESS", "BOOKING_REQUESTED"].includes(status))
    return "confirming";
  if (
    [
      "BOOKING_FAILED",
      "PAYMENT_FAILED",
      "HOLD_FAILED",
      "CANCELLATION_FAILED",
    ].includes(status)
  )
    return "failed";
  if (status === "HOLD_EXPIRED") return "expired";
  return "payment_pending";
}
export const isBookingTransient = (status: string) =>
  [
    "PAYMENT_PENDING",
    "PAYMENT_SUCCESS",
    "BOOKING_REQUESTED",
    "BOOKING_UNKNOWN",
    "CANCELLATION_REQUESTED",
    "REFUND_PENDING",
  ].includes(status);
export const canIssueTicket = (status: string) =>
  ["CONFIRMED", "CANCELLATION_REQUESTED", "CANCELLED"].includes(status);
export function bookingSegment(
  booking: { status: string; journeyDate: string; cancelledAt?: string | null },
  today: string,
) {
  if (booking.cancelledAt || booking.status === "CANCELLED") return "CANCELLED";
  return booking.journeyDate.slice(0, 10) >= today &&
    [
      "CONFIRMED",
      "HELD",
      "PAYMENT_PENDING",
      "PAYMENT_SUCCESS",
      "BOOKING_REQUESTED",
      "BOOKING_UNKNOWN",
      "CANCELLATION_REQUESTED",
    ].includes(booking.status)
    ? "UPCOMING"
    : "PAST_TRIPS";
}

export const ticketPollingInterval = (status: string, responses: number): number | false => isBookingTransient(status) && responses < 12 ? 5000 : false;
