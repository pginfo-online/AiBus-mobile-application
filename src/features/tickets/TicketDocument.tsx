import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { TicketResponseData } from "../../types/api";
import { bookingPhase } from "../booking/bookingLifecycle";

export function TicketDocument({
  ticket,
  onHelp,
}: {
  ticket: TicketResponseData;
  onHelp?: () => void;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const b = ticket.booking;
  const pickup = b.pickupSnapshot || {};
  const drop = b.dropoffSnapshot || {};
  const departure =
    pickup.departureDateTime ||
    [b.journeyDate.slice(0, 10), b.pickupTime].filter(Boolean).join(" · ");
  const arrival = drop.arrivalDateTime || b.dropoffTime;
  const format = (value?: string) => {
    if (!value) return "—";
    if (!value.includes("T")) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(`${language}-IN`, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });
  };
  return (
    <View style={{ gap: 18 }}>
      <View style={{ padding: 24, backgroundColor: colors.primary, gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <AppText variant="heading3" style={{ color: colors.textInverse }}>
            AiBus
          </AppText>
          <AppText variant="heading3" style={{ color: colors.textInverse }}>
            {t("flow.trip_details")}
          </AppText>
        </View>
        <AppText
          variant="heading3"
          align="center"
          style={{ color: colors.textInverse }}
        >
          {b.fromCityName} – {b.toCityName}
        </AppText>
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.primaryLight,
            paddingTop: 12,
            gap: 4,
          }}
        >
          <AppText align="center" style={{ color: colors.textInverse }}>
            {t("flow.ticket_number")}: {ticket.ticketNumber || "—"}
          </AppText>
          <AppText align="center" style={{ color: colors.textInverse }}>
            PNR: {ticket.pnrNumber || "—"}
          </AppText>
        </View>
      </View>
      <AppText>{t("flow.greeting", { name: b.contactName })}</AppText>
      <AppText style={{ color: colors.textSecondary }}>
        {t("flow.ticket_intro", { from: b.fromCityName, to: b.toCityName })}
      </AppText>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ padding: 16, backgroundColor: colors.surfaceSecondary }}>
          <AppText variant="bodyMedium">{t("flow.journey_details")}</AppText>
        </View>
        <View style={{ padding: 18, gap: 20 }}>
          <View style={{ flexDirection: "row", gap: 20 }}>
            {[
              { label: t("flow.departure"), value: format(departure) },
              { label: t("flow.arrival"), value: format(arrival) },
            ].map(({ label, value }) => (
              <View key={label} style={{ flex: 1, gap: 8 }}>
                <AppText
                  variant="caption"
                  style={{ color: colors.textSecondary }}
                >
                  {label}
                </AppText>
                <AppText variant="bodyMedium">{value}</AppText>
              </View>
            ))}
          </View>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" style={{ color: colors.textSecondary }}>
              {t("flow.travels")}
            </AppText>
            <AppText variant="bodyMedium">{b.operatorName}</AppText>
            <AppText style={{ color: colors.textSecondary }}>
              {b.busType}
            </AppText>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
              paddingTop: 20,
              flexDirection: "row",
              gap: 20,
            }}
          >
            {[
              { label: t("pax.pickup"), name: b.pickupLocation, point: pickup },
              { label: t("pax.drop"), name: b.dropoffLocation, point: drop },
            ].map(({ label, name, point }) => (
              <View key={label} style={{ flex: 1, gap: 6 }}>
                <AppText
                  variant="caption"
                  style={{ color: colors.textSecondary }}
                >
                  {label}
                </AppText>
                <AppText variant="bodyMedium">{name || "—"}</AppText>
                {point.address && (
                  <AppText style={{ color: colors.textSecondary }}>
                    {point.address}
                  </AppText>
                )}
                {point.landmark && (
                  <AppText style={{ color: colors.textSecondary }}>
                    {point.landmark}
                  </AppText>
                )}
                {point.contact && (
                  <AppText style={{ color: colors.primary }}>
                    {point.contact}
                  </AppText>
                )}
              </View>
            ))}
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
              paddingTop: 20,
              gap: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <AppText
                variant="caption"
                style={{ color: colors.textSecondary }}
              >
                {t("pax.passenger_details")}
              </AppText>
              <AppText variant="caption">{t("pax.seats")}</AppText>
            </View>
            {b.passengers.map((p) => {
              const cancelled = b.seats.find(
                (s) => s.seatNo === p.seatNo,
              )?.cancelledAt;
              return (
                <View
                  key={p.id || p.seatNo}
                  style={{ flexDirection: "row", gap: 16 }}
                >
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium">{p.name}</AppText>
                    <AppText style={{ color: colors.textSecondary }}>
                      {t("pax.years", { age: p.age })},{" "}
                      {t(`pax.gender_${p.gender}`)}
                    </AppText>
                    {cancelled && (
                      <AppText style={{ color: colors.danger }}>
                        {t("flow.cancelled")}
                      </AppText>
                    )}
                  </View>
                  <AppText variant="bodyMedium">{p.seatNo}</AppText>
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View
        style={{
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        <AppText>
          {t("flow.status")}: {t(`flow.${bookingPhase(b.status)}`)}
        </AppText>
        <AppText>
          {t("pax.amount")}: ₹
          {Number(b.totalFare).toLocaleString(`${language}-IN`, {
            minimumFractionDigits: 2,
          })}
        </AppText>
      </View>
      {b.refunds?.map((refund) => (
        <View
          key={refund.id}
          style={{
            padding: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
          }}
        >
          <AppText>
            {t("flow.refund")}: ₹{Number(refund.amount).toFixed(2)}
          </AppText>
          <AppText>{t(`flow.refund_${refund.status}`)}</AppText>
        </View>
      ))}
      {Array.isArray(b.cancellationPolicy) && b.cancellationPolicy.filter((policy) => typeof policy.title === 'string' && typeof policy.description === 'string').map((policy, index) => <View key={index} style={{ padding: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 }}><AppText variant="bodyMedium">{policy.title}</AppText><AppText>{policy.description}</AppText></View>)}
      {onHelp && (
        <Pressable
          accessibilityRole="button"
          onPress={onHelp}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={colors.primary}
          />
          <AppText style={{ flex: 1 }}>{t("flow.need_help")}</AppText>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}
