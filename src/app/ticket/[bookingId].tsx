import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { useTicketQuery } from "../../features/tickets/useTicketQuery";
import { FlowSkeleton } from "../../features/booking/FlowSkeleton";
import { TicketDocument } from "../../features/tickets/TicketDocument";
import { generateAndShareTicketPdf } from "../../features/tickets/ticketPdfGenerator";
import { CancelTicketModal } from "../../features/cancellations/CancelTicketModal";
import {
  bookingPhase,
  canIssueTicket,
} from "../../features/booking/bookingLifecycle";

export default function TicketDetailsScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const query = useTicketQuery(bookingId);
  const [cancel, setCancel] = useState(false);
  const [sharing, setSharing] = useState(false);
  const ticket = query.data;
  const booking = ticket?.booking;
  const help = () => router.push("/(tabs)/help");
  const share = async () => {
    if (!ticket || sharing) return;
    setSharing(true);
    try {
      await generateAndShareTicketPdf(ticket, language);
    } catch {
      Alert.alert(t("flow.share_error"));
    } finally {
      setSharing(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/bookings")
          }
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="heading3" style={{ flex: 1 }}>
          {t("flow.trip_details")}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("flow.need_help")}
          onPress={help}
        >
          <Ionicons name="help-circle-outline" size={26} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {query.isLoading && !ticket ? <FlowSkeleton /> : null}
        {query.isError && (
          <View style={{ gap: 12 }}>
            <AppText style={{ color: colors.danger }}>
              {t("flow.load_error")}
            </AppText>
            <AppButton
              title={t("common.retry")}
              variant="outline"
              onPress={() => {
                void query.refetch();
              }}
            />
          </View>
        )}
        {ticket && booking && (
          <>
            <View
              style={{
                padding: 16,
                backgroundColor: colors.surfaceSecondary,
                gap: 8,
              }}
            >
              <AppText variant="bodyMedium">
                {t(`flow.${bookingPhase(booking.status)}`)}
              </AppText>
              {!canIssueTicket(booking.status) && (
                <>
                  <AppText>{t("flow.pending_body")}</AppText>
                  <AppButton
                    title={t("flow.check_status")}
                    variant="outline"
                    onPress={() => {
                      const payment =
                        booking.payments?.[booking.payments.length - 1];
                      if (payment)
                        router.push({
                          pathname: "/booking/processing",
                          params: {
                            bookingId: booking.id,
                            merchantTxnId: payment.merchantTxnId,
                          },
                        });
                      else void query.refetch();
                    }}
                  />
                </>
              )}
            </View>
            <TicketDocument ticket={ticket} onHelp={help} />
          </>
        )}
      </ScrollView>
      {ticket?.ticketNumber && ticket.pnrNumber && booking && (
        <View
          style={{
            padding: 16,
            gap: 12,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <AppButton
            title={t("flow.share_ticket")}
            onPress={() => {
              void share();
            }}
            loading={sharing}
          />
          {booking.status === "CONFIRMED" &&
            booking.seats.some((s) => !s.cancelledAt) && (
              <AppButton
                title={t("flow.cancel_ticket")}
                variant="outline"
                onPress={() => setCancel(true)}
              />
            )}
        </View>
      )}
      {booking && cancel && (
        <CancelTicketModal
          key={booking.id}
          visible
          onClose={() => setCancel(false)}
          booking={booking}
          onCancelled={() => {
            void query.refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}
