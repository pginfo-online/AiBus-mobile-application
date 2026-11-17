import React, { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { apiClient } from "../../core/api/client";
import {
  PendingPaymentRecord,
  PendingPaymentStorage,
} from "../../core/storage";
import { useAuthStore } from "../../stores/authStore";
import { useBookingStore } from "../../stores/bookingStore";
import { VerifyPaymentResponse } from "../../features/payments/usePaymentMutations";
import { FlowSkeleton } from "../../features/booking/FlowSkeleton";
import { bookingPhase } from "../../features/booking/bookingLifecycle";

export default function ProcessingPaymentScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const params = useLocalSearchParams<{
    bookingId?: string;
    merchantTxnId?: string;
  }>();
  const owner = useAuthStore((s) => s.user?.id);
  const reset = useBookingStore((s) => s.resetBookingFlow);
  const [pending, setPending] = useState<PendingPaymentRecord | null>(null);
  const [started, setStarted] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    void PendingPaymentStorage.get().then((value) => {
      if (alive && value?.userId === owner) setPending(value);
    });
    return () => {
      alive = false;
    };
  }, [owner]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const id = params.bookingId || pending?.bookingId;
  const transaction = params.merchantTxnId || pending?.merchantTxnId;
  const stored =
    pending?.bookingId === id && pending?.merchantTxnId === transaction
      ? pending
      : null;
  const elapsed = now - started;
  const active = elapsed < 25000;
  const query = useQuery<VerifyPaymentResponse>({
    queryKey: ["payment-outcome", owner, id, transaction],
    enabled: Boolean(owner && id && transaction && active),
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) =>
      (
        await apiClient.post(
          "/payments/verify",
          {
            bookingId: id,
            merchantTxnId: transaction,
            gatewayPaymentId: stored?.gatewayPaymentId,
            gatewaySignature: stored?.gatewaySignature,
          },
          { signal, timeout: 12000 },
        )
      ).data.data,
    refetchInterval: (q) =>
      active &&
      (!q.state.data ||
        ["PENDING", "BOOKING_UNKNOWN"].includes(q.state.data.status))
        ? 3000
        : false,
  });
  const result = query.data;
  const confirmed = result?.booking.status === "CONFIRMED";
  const terminal = Boolean(
    result && ["SUCCESS", "FAILED", "BOOKING_FAILED"].includes(result.status),
  );
  const phase = confirmed
    ? "confirmed"
    : result
      ? bookingPhase(result.booking.status)
      : "payment_pending";
  const busy = active && !terminal && !query.isError;
  useEffect(() => {
    if (!result || !terminal || !id) return;
    void client.invalidateQueries({ queryKey: ["bookings"] });
    void client.invalidateQueries({ queryKey: ["tickets", "booking", id] });
    void client.invalidateQueries({ queryKey: ["user", "wallet"] });
    void client.invalidateQueries({ queryKey: ["passenger-profile", owner] });
    void client.invalidateQueries({ queryKey: ["offers"] });
    void PendingPaymentStorage.get().then((record) => {
      if (record?.bookingId === id && record.userId === owner)
        void PendingPaymentStorage.clear();
    });
    if (confirmed) reset();
  }, [result, terminal, id, owner, confirmed, client, reset]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}>
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 20 }}>
          <Ionicons
            name={
              confirmed
                ? "checkmark-circle"
                : phase === "failed"
                  ? "alert-circle"
                  : "shield-checkmark-outline"
            }
            size={64}
            color={confirmed ? colors.success : colors.primary}
          />
          <AppText variant="heading2" align="center">
            {t(`flow.${phase}`)}
          </AppText>
          <AppText align="center" style={{ color: colors.textSecondary }}>
            {t(
              confirmed
                ? "flow.confirmed_body"
                : busy
                  ? "flow.verifying_body"
                  : "flow.pending_body",
            )}
          </AppText>
        </View>
        <AppCard padding="base">
          <View style={{ gap: 20 }}>
            {["payment", "operator", "ticket"].map((step, index) => {
              const done =
                index === 0
                  ? ["SUCCESS", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
                      result?.payment.status || "",
                    )
                  : confirmed;
              return (
                <View
                  key={step}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={done ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={done ? colors.success : colors.textMuted}
                  />
                  <AppText>{t(`flow.step_${step}`)}</AppText>
                </View>
              );
            })}
          </View>
        </AppCard>
        {result?.booking ? (
          <AppCard padding="base">
            <View style={{ gap: 8 }}>
              <AppText variant="heading3">
                {result.booking.fromCityName} → {result.booking.toCityName}
              </AppText>
              <AppText>{result.booking.operatorName}</AppText>
              <AppText>{result.booking.bookingNumber}</AppText>
            </View>
          </AppCard>
        ) : busy ? (
          <FlowSkeleton kind="card" />
        ) : null}
        {!busy && !confirmed && (
          <AppButton
            title={t("flow.check_status")}
            onPress={() => {
              setStarted(Date.now());
              setNow(Date.now());
              void query.refetch({ cancelRefetch: false });
            }}
            variant="outline"
          />
        )}
        {confirmed && id && (
          <AppButton
            title={t("flow.view_ticket")}
            onPress={() =>
              router.replace({
                pathname: "/ticket/[bookingId]",
                params: { bookingId: id },
              })
            }
            fullWidth
          />
        )}
        <AppButton
          title={t("tab.bookings")}
          onPress={() => router.replace("/(tabs)/bookings")}
          variant="outline"
          fullWidth
        />
        <AppButton
          title={t("tab.home")}
          onPress={() => router.replace("/(tabs)/home")}
          variant="ghost"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
