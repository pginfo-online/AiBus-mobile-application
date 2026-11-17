import React from "react";
import { Redirect, useRouter } from "expo-router";
import {
  PassengerPage,
  PassengersSkeleton,
} from "../../features/passengers/PassengerComponents";
import { PassengerForm } from "../../features/passengers/PassengerForm";
import { useSavePassenger } from "../../features/passengers/usePassengers";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../core/localization";
export default function NewPassengerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSavePassenger();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapping = useAuthStore((s) => s.isBootstrapping);
  if (bootstrapping)
    return (
      <PassengerPage title={t("pax.title")}>
        <PassengersSkeleton />
      </PassengerPage>
    );
  if (!authenticated) return <Redirect href="/(auth)/login" />;
  return (
    <PassengerPage title={t("pax.new")}>
      <PassengerForm
        pending={save.isPending}
        onSave={async (input) => {
          await save.mutateAsync(input);
          router.back();
        }}
      />
    </PassengerPage>
  );
}
