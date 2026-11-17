import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import {
  BookingResponseData,
  CancellationResultResponse,
} from "../../types/api";
import {
  useCancelBookingMutation,
  useCheckCancellabilityQuery,
} from "./useCancellation";
import { FlowSkeleton } from "../booking/FlowSkeleton";

export function CancelTicketModal({
  visible,
  onClose,
  booking,
  onCancelled,
}: {
  visible: boolean;
  onClose: () => void;
  booking: BookingResponseData;
  ticketNumber?: string;
  pnrNumber?: string;
  onCancelled?: (result: CancellationResultResponse) => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const active = booking.seats.filter((s) => !s.cancelledAt);
  const [seats, setSeats] = useState(active.map((s) => s.seatNo));
  const [result, setResult] = useState<CancellationResultResponse | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const query = useCheckCancellabilityQuery(
    booking.id,
    seats,
    visible && !result && seats.length > 0,
  );
  const mutation = useCancelBookingMutation();
  const cancel = async () => {
    if (lock.current || !query.data?.IsCancellable || !seats.length) return;
    lock.current = true;
    setError("");
    try {
      const response = await mutation.mutateAsync({
        bookingId: booking.id,
        seatNos: seats,
        refundToWallet: false,
      });
      setResult(response);
      onCancelled?.(response);
    } catch {
      setError(t("flow.cancel_uncertain"));
    } finally {
      lock.current = false;
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 20 }}>
          <AppText variant="heading2">{t("flow.cancel_ticket")}</AppText>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <AppText>
            {booking.fromCityName} → {booking.toCityName}
          </AppText>
          <AppText>{booking.bookingNumber}</AppText>
          {result ? (
            <>
              <AppText variant="heading3">
                {t(
                  result.cancellation.status === "COMPLETED"
                    ? "flow.cancelled"
                    : "flow.cancelling",
                )}
              </AppText>
              <AppText>
                {t(
                  result.cancellation.status === "COMPLETED"
                    ? "flow.cancel_done"
                    : "flow.cancel_uncertain",
                )}
              </AppText>
              {result.refunds?.map((refund) => (
                <View
                  key={refund.id}
                  style={{
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 8,
                  }}
                >
                  <AppText>
                    {t("flow.refund")}: ₹{Number(refund.amount).toFixed(2)}
                  </AppText>
                  <AppText>{t(`flow.refund_${refund.status}`)}</AppText>
                  <AppText>
                    {t(
                      refund.destination === "WALLET"
                        ? "flow.wallet_destination"
                        : "flow.original_destination",
                    )}
                  </AppText>
                </View>
              ))}
            </>
          ) : (
            <>
              <AppText>{t("flow.select_cancel_seats")}</AppText>
              {active.map((seat) => (
                <Pressable
                  key={seat.seatNo}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: seats.includes(seat.seatNo) }}
                  disabled={mutation.isPending}
                  onPress={() =>
                    setSeats((current) =>
                      current.includes(seat.seatNo)
                        ? current.filter((s) => s !== seat.seatNo)
                        : [...current, seat.seatNo],
                    )
                  }
                  style={{
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: seats.includes(seat.seatNo)
                      ? colors.primarySoft
                      : colors.surface,
                    borderRadius: 12,
                  }}
                >
                  <AppText>
                    {seat.seatNo} ·{" "}
                    {
                      booking.passengers.find((p) => p.seatNo === seat.seatNo)
                        ?.name
                    }
                  </AppText>
                </Pressable>
              ))}
              {query.isLoading ? (
                <FlowSkeleton kind="cancellation" />
              ) : query.isError ? (
                <View style={{ gap: 12 }}>
                  <AppText style={{ color: colors.danger }}>
                    {t("flow.quote_error")}
                  </AppText>
                  <AppButton
                    title={t("common.retry")}
                    onPress={() => {
                      void query.refetch();
                    }}
                    variant="outline"
                  />
                </View>
              ) : (
                query.data && (
                  <View
                    style={{
                      padding: 20,
                      backgroundColor: colors.surface,
                      gap: 12,
                    }}
                  >
                    <AppText>
                      {t("flow.cancellation_charge")}: ₹
                      {Number(query.data.CancellationCharge ?? 0).toFixed(2)}
                    </AppText>
                    <AppText>
                      {t("flow.refund_estimate")}: ₹
                      {Number(query.data.RefundAmount ?? 0).toFixed(2)}
                    </AppText>
                    <AppText style={{ color: colors.textSecondary }}>
                      {t(
                        query.data.IsCancellable
                          ? "flow.quote_hint"
                          : "flow.not_cancellable",
                      )}
                    </AppText>
                  </View>
                )
              )}
              {error ? (
                <AppText style={{ color: colors.warning }}>{error}</AppText>
              ) : null}
            </>
          )}
        </ScrollView>
        <View style={{ padding: 20, gap: 12 }}>
          {!result && !error && (
            <AppButton
              title={t("flow.confirm_cancel")}
              onPress={() => {
                void cancel();
              }}
              loading={mutation.isPending}
              disabled={
                !query.data?.IsCancellable || query.isFetching || !seats.length
              }
              variant="danger"
            />
          )}
          <AppButton
            title={t(result || error ? "pax.close" : "common.back")}
            onPress={onClose}
            disabled={mutation.isPending}
            variant="outline"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
