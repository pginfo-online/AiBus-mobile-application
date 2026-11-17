import React from "react";
import { Pressable, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { useAuthStore } from "../../stores/authStore";
import {
  PassengerError,
  PassengerPage,
  PassengersSkeleton,
} from "../../features/passengers/PassengerComponents";
import {
  usePassengerProfile,
  usePassengers,
} from "../../features/passengers/usePassengers";
import { passengerAge } from "../../features/passengers/passengerModel";

export default function PassengersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const passengers = usePassengers();
  const profile = usePassengerProfile();
  const bootstrapping = useAuthStore((s) => s.isBootstrapping);
  if (bootstrapping)
    return (
      <PassengerPage title={t("pax.title")}>
        <PassengersSkeleton />
      </PassengerPage>
    );
  if (!authenticated) return <Redirect href="/(auth)/login" />;
  return (
    <PassengerPage
      title={t("pax.title")}
      footer={
        <AppButton
          title={t("pax.add_new")}
          onPress={() => router.push("/passengers/new")}
          size="lg"
          fullWidth
        />
      }
    >
      {profile.isPending ? (
        <PassengersSkeleton form />
      ) : profile.isError && !profile.data ? (
        <PassengerError
          onRetry={() => {
            void profile.refetch();
          }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/passengers/personal")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading3">
              {[profile.data?.firstName, profile.data?.lastName]
                .filter(Boolean)
                .join(" ")}
            </AppText>
            <AppText style={{ color: colors.textSecondary }}>
              {t("pax.personal_information")}
            </AppText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      )}
      <AppText variant="heading3">{t("pax.saved")}</AppText>
      {passengers.isPending ? (
        <PassengersSkeleton />
      ) : (
        <>
          {passengers.isError && (
            <PassengerError
              onRetry={() => {
                void passengers.refetch();
              }}
            />
          )}
          {passengers.data?.length === 0 && (
            <AppText style={{ color: colors.textSecondary }}>
              {t("pax.empty")}
            </AppText>
          )}
          {passengers.data?.map((passenger) => (
            <Pressable
              key={passenger.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/passengers/[id]",
                  params: { id: passenger.id },
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{passenger.name}</AppText>
                <AppText style={{ color: colors.textSecondary }}>
                  {t(`pax.gender_${passenger.gender}`)},{" "}
                  {t("pax.years", { age: passengerAge(passenger) })}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          ))}
        </>
      )}
    </PassengerPage>
  );
}
