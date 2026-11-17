import React from "react";
import { Redirect, useRouter } from "expo-router";
import {
  PassengerError,
  PassengerPage,
  PassengersSkeleton,
} from "../../features/passengers/PassengerComponents";
import { PassengerForm } from "../../features/passengers/PassengerForm";
import {
  usePassengerProfile,
  useSavePersonalProfile,
} from "../../features/passengers/usePassengers";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../core/localization";
export default function PersonalInformationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = usePassengerProfile();
  const save = useSavePersonalProfile();
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
    <PassengerPage title={t("pax.personal_information")}>
      {query.isPending ? (
        <PassengersSkeleton form />
      ) : query.data ? (
        <PassengerForm
          personal={query.data}
          pending={save.isPending}
          onSave={async (_, input) => {
            if (input) {
              await save.mutateAsync(input);
              router.back();
            }
          }}
        />
      ) : (
        <PassengerError
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
    </PassengerPage>
  );
}
