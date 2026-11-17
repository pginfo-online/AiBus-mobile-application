import React from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  PassengerError,
  PassengerPage,
  PassengersSkeleton,
} from "../../features/passengers/PassengerComponents";
import { PassengerForm } from "../../features/passengers/PassengerForm";
import {
  usePassengers,
  useSavePassenger,
} from "../../features/passengers/usePassengers";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../core/localization";
export default function EditPassengerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const query = usePassengers();
  const save = useSavePassenger(id);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const passenger = query.data?.find((p) => p.id === id);
  const bootstrapping = useAuthStore((s) => s.isBootstrapping);
  if (bootstrapping)
    return (
      <PassengerPage title={t("pax.title")}>
        <PassengersSkeleton />
      </PassengerPage>
    );
  if (!authenticated) return <Redirect href="/(auth)/login" />;
  return (
    <PassengerPage title={passenger?.name || t("pax.title")}>
      {query.isPending ? (
        <PassengersSkeleton form />
      ) : passenger ? (
        <PassengerForm
          key={passenger.id}
          passenger={passenger}
          pending={save.isPending}
          onSave={async (input) => {
            await save.mutateAsync(input);
            router.back();
          }}
        />
      ) : (
        <PassengerError
          message={query.isError ? undefined : t("pax.not_found")}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
    </PassengerPage>
  );
}
