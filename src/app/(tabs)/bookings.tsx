import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { useAuthStore } from "../../stores/authStore";
import { useUserBookingsQuery } from "../../features/booking/useBookingMutations";
import { FlowSkeleton } from "../../features/booking/FlowSkeleton";
import { bookingPhase } from "../../features/booking/bookingLifecycle";
import {
  PendingPaymentRecord,
  PendingPaymentStorage,
} from "../../core/storage";

export default function BookingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const owner = useAuthStore((s) => s.user?.id);
  const bootstrapping = useAuthStore((s) => s.isBootstrapping);
  const [filter, setFilter] = useState<"UPCOMING" | "PAST_TRIPS" | "CANCELLED">(
    "UPCOMING",
  );
  const [pending, setPending] = useState<PendingPaymentRecord | null>(null);
  const query = useUserBookingsQuery(Boolean(owner), filter);
  const { refetch, dataUpdatedAt } = query;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void PendingPaymentStorage.get().then((record) => {
        if (alive)
          setPending(
            record?.userId === owner &&
              record &&
              !PendingPaymentStorage.isExpired(record)
              ? record
              : null,
          );
      });
      if (owner && dataUpdatedAt && Date.now() - dataUpdatedAt > 30000)
        void refetch({ cancelRefetch: false });
      return () => {
        alive = false;
      };
    }, [owner, refetch, dataUpdatedAt]),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, backgroundColor: colors.surface }}>
        <AppText variant="heading2">{t("tab.bookings")}</AppText>
      </View>
      <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
        {(["UPCOMING", "PAST_TRIPS", "CANCELLED"] as const).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === tab }}
            onPress={() => setFilter(tab)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor:
                filter === tab ? colors.primarySoft : colors.surface,
            }}
          >
            <AppText
              align="center"
              style={{
                color: filter === tab ? colors.primary : colors.textSecondary,
              }}
            >
              {t(`flow.tab_${tab}`)}
            </AppText>
          </Pressable>
        ))}
      </View>
      {bootstrapping ? (
        <FlowSkeleton kind="card" count={3} />
      ) : !owner ? (
        <View style={{ padding: 24, gap: 16 }}>
          <AppText>{t("flow.login_bookings")}</AppText>
          <AppButton
            title={t("account.login")}
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      ) : (
        <FlatList
          data={query.data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => {
                if (!query.isFetching)
                  void query.refetch({ cancelRefetch: false });
              }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {pending && (
                <AppButton
                  title={t("flow.resume")}
                  variant="outline"
                  onPress={() =>
                    router.push({
                      pathname: "/booking/processing",
                      params: {
                        bookingId: pending.bookingId,
                        merchantTxnId: pending.merchantTxnId,
                      },
                    })
                  }
                />
              )}
              {query.isError && (
                <View style={{ gap: 12 }}>
                  <AppText style={{ color: colors.danger }}>
                    {t("flow.load_error")}
                  </AppText>
                  <AppButton
                    title={t("common.retry")}
                    onPress={() => {
                      void query.refetch();
                    }}
                    variant="outline"
                  />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            query.isLoading ? (
              <FlowSkeleton kind="card" count={3} />
            ) : !query.isError ? (
              <View
                style={{ paddingVertical: 40, alignItems: "center", gap: 16 }}
              >
                <Ionicons name="bus-outline" size={48} color={colors.primary} />
                <AppText>{t("flow.empty_bookings")}</AppText>
                <AppButton
                  title={t("flow.find_bus")}
                  onPress={() => router.push("/(tabs)/home")}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/ticket/[bookingId]",
                  params: { bookingId: item.id },
                })
              }
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 20,
                padding: 20,
                gap: 12,
              }}
            >
              <AppText style={{ color: colors.primary }}>
                {t(`flow.${bookingPhase(item.status)}`)}
              </AppText>
              <AppText variant="heading3">
                {item.fromCityName} → {item.toCityName}
              </AppText>
              <AppText style={{ color: colors.textSecondary }}>
                {new Date(
                  `${item.journeyDate.slice(0, 10)}T12:00:00`,
                ).toLocaleDateString(`${language}-IN`, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {item.pickupTime}
              </AppText>
              <AppText>{item.operatorName}</AppText>
              <AppText style={{ color: colors.textSecondary }}>
                {t("pax.seats")}:{" "}
                {item.seats
                  .filter((seat) => !seat.cancelledAt)
                  .map((s) => s.seatNo)
                  .join(", ") || "—"}
              </AppText>
              <AppText style={{ color: colors.primary }}>
                {t("flow.view_details")} →
              </AppText>
            </Pressable>
          )}
          ListFooterComponent={
            query.hasNextPage ? (
              <AppButton
                title={t("flow.more")}
                loading={query.isFetchingNextPage}
                onPress={() => {
                  if (!query.isFetchingNextPage) void query.fetchNextPage();
                }}
                variant="outline"
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
