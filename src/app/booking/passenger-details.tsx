import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppInput, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { useBookingStore, PassengerItem } from "../../stores/bookingStore";
import { useAuthStore } from "../../stores/authStore";
import { useHoldSeatsMutation } from "../../features/booking/useBookingMutations";
import {
  PassengerError,
  PassengerHeader,
  PassengerSheet,
  PassengersSkeleton,
  StatePicker,
} from "../../features/passengers/PassengerComponents";
import { PassengerForm } from "../../features/passengers/PassengerForm";
import {
  availableSeatIndex,
  passengerAge,
  SavedPassenger,
  validEmail,
  validGstin,
  validMobile,
} from "../../features/passengers/passengerModel";
import {
  usePassengerProfile,
  usePassengers,
  useSavePassenger,
} from "../../features/passengers/usePassengers";

export default function PassengerDetailsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const booking = useBookingStore();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const profile = usePassengerProfile();
  const query = usePassengers();
  const save = useSavePassenger();
  const hold = useHoldSeatsMutation();
  const [sheet, setSheet] = useState<"details" | "contact" | "add" | null>(
    null,
  );
  const [assignments, setAssignments] = useState<(string | null)[]>(() =>
    booking.selectedSeats.map(
      (seat) =>
        booking.passengers.find((p) => p.seatNo === seat.seatNo)
          ?.savedPassengerId || null,
    ),
  );
  type Contact = { phone: string; email: string; state: string };
  const [contactOverride, setContact] = useState<Contact | null>(
    booking.contactPhone
      ? {
          phone: booking.contactPhone,
          email: booking.contactEmail,
          state: booking.contactState || "",
        }
      : null,
  );
  const contactProfile = profile.data || user;
  const contact = contactOverride || {
    phone: contactProfile?.personalPhone || contactProfile?.phone || "",
    email:
      contactProfile?.contactEmail ??
      (contactProfile?.email?.endsWith("@mobile.aibus.app")
        ? ""
        : contactProfile?.email) ??
      "",
    state: contactProfile?.state || "",
  };
  const [draftContact, setDraftContact] = useState(contact);
  const [contactError, setContactError] = useState("");
  const [hasGst, setHasGst] = useState(Boolean(booking.gstin));
  const [gst, setGst] = useState({
    gstin: booking.gstin || "",
    gstCompany: booking.gstCompany || "",
    businessAddress: booking.gstAddress || "",
    email: booking.gstEmail || "",
  });
  const [error, setError] = useState("");
  const locking = useRef(false);
  const {
    selectedBus: bus,
    selectedSeats: seats,
    selectedBoardingPoint: pickup,
    selectedDroppingPoint: drop,
    journeyDate,
  } = booking;
  const passengers = query.data || [];
  const selectedCount = assignments.filter(Boolean).length;
  const locale = `${language}-IN`;
  const date = new Date(`${journeyDate}T12:00:00`).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const busName =
    bus?.CompanyName || bus?.OperatorName || bus?.BusName || t("pax.bus");
  const busType = bus?.BusType || bus?.BusTypeName || "";
  const toggle = (passenger: SavedPassenger) => {
    setError("");
    const index = assignments.indexOf(passenger.id);
    if (index >= 0) {
      setAssignments((current) =>
        current.map((id) => (id === passenger.id ? null : id)),
      );
      return;
    }
    const age = passengerAge(passenger, new Date(`${journeyDate}T12:00:00`));
    if (age < 1 || age > 120) {
      setError(t("pax.invalid_age"));
      return;
    }
    const free = availableSeatIndex(seats, assignments, passenger.gender);
    if (free < 0) {
      setError(t("pax.no_matching_seat"));
      return;
    }
    setAssignments((current) =>
      current.map((id, seatIndex) => (seatIndex === free ? passenger.id : id)),
    );
  };
  const validateContact = (value: typeof contact) =>
    !validMobile(value.phone)
      ? t("pax.invalid_mobile")
      : !validEmail(value.email.trim())
        ? t("pax.invalid_email")
        : !value.state
          ? t("pax.required_state")
          : "";
  const proceed = async () => {
    if (locking.current) return;
    if (!authenticated) {
      router.push("/(auth)/login");
      return;
    }
    if (!bus || !pickup || !drop || !seats.length) {
      setError(t("pax.missing_journey"));
      return;
    }
    if (selectedCount !== seats.length) {
      setError(t("pax.select_count", { count: seats.length }));
      return;
    }
    const invalidContact = validateContact(contact);
    if (invalidContact) {
      setContactError(invalidContact);
      setDraftContact(contact);
      setSheet("contact");
      return;
    }
    if (
      hasGst &&
      (!validGstin(gst.gstin.trim()) ||
        gst.gstCompany.trim().length < 2 ||
        gst.businessAddress.trim().length < 5 ||
        !validEmail(gst.email.trim()))
    ) {
      setError(t("pax.invalid_gst"));
      return;
    }
    const details: PassengerItem[] = [];
    for (let index = 0; index < seats.length; index++) {
      const passenger = passengers.find((p) => p.id === assignments[index]);
      const seat = seats[index];
      if (
        !passenger ||
        (seat.requiredGender && seat.requiredGender !== passenger.gender)
      ) {
        setError(t("pax.no_matching_seat"));
        return;
      }
      const age = passengerAge(passenger, new Date(`${journeyDate}T12:00:00`));
      if (age < 1 || age > 120) {
        setError(t("pax.invalid_age"));
        return;
      }
      details.push({
        savedPassengerId: passenger.id,
        seatNo: seat.seatNo,
        seatTypeId: seat.seatType,
        fare: seat.fare,
        gender: passenger.gender,
        age,
        name: passenger.name,
        isAcSeat: bus.IsAC ?? false,
      });
    }
    locking.current = true;
    setError("");
    booking.setPassengers(details);
    booking.setContactInfo({
      name: details[0].name,
      phone: contact.phone,
      email: contact.email.trim().toLowerCase(),
      state: contact.state,
    });
    booking.setGstDetails(
      hasGst ? gst.gstin.trim() : undefined,
      hasGst ? gst.gstCompany.trim() : undefined,
      hasGst ? gst.businessAddress.trim() : undefined,
      hasGst ? gst.email.trim().toLowerCase() : undefined,
    );
    try {
      const held = await hold.mutateAsync({
        fromCityId: booking.fromCity.providerCityId,
        toCityId: booking.toCity.providerCityId,
        journeyDate,
        busId: bus.RouteBusId || bus.BusId,
        pickupId: pickup.code,
        dropoffId: drop.code,
        contactInfo: {
          customerName: details[0].name,
          phone: contact.phone,
          mobile: contact.phone,
          email: contact.email.trim().toLowerCase(),
          state: contact.state,
        },
        gstDetails: hasGst
          ? {
              gstin: gst.gstin.trim(),
              gstCompany: gst.gstCompany.trim(),
              businessAddress: gst.businessAddress.trim(),
              email: gst.email.trim().toLowerCase(),
            }
          : undefined,
        passengers: details,
      });
      if (useAuthStore.getState().user?.id !== user?.id) return;
      booking.setActiveHold({
        id: held.id,
        providerHoldId: held.providerHoldId,
        expiresAt: held.expiresAt,
        ttlSeconds: held.ttlSeconds ?? 600,
        totalFare:
          held.totalFare ?? seats.reduce((sum, seat) => sum + seat.fare, 0),
      });
      router.push("/booking/review");
    } catch {
      Alert.alert(t("pax.hold_error_title"), t("pax.hold_error"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("pax.choose_seats"),
          onPress: () => router.navigate("/booking/seat-map"),
        },
      ]);
    } finally {
      locking.current = false;
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <PassengerHeader
        title={t("pax.information")}
        subtitle={`${booking.fromCity.name} → ${booking.toCity.name}`}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 16 }}
        >
          <AppCard
            padding="base"
            variant="elevated"
            style={{ borderRadius: 24 }}
          >
            <AppText variant="heading3">{busName}</AppText>
            <AppText style={{ color: colors.textSecondary, marginTop: 6 }}>
              {booking.fromCity.name} → {booking.toCity.name}
            </AppText>
            <AppText style={{ marginTop: 12, marginBottom: 8 }}>{date}</AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{pickup?.time || "—"}</AppText>
                <AppText style={{ color: colors.textSecondary }}>
                  {pickup?.name || booking.fromCity.name}
                </AppText>
              </View>
              <Ionicons
                name="arrow-forward"
                color={colors.textMuted}
                size={20}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium" align="right">
                  {drop?.time || "—"}
                </AppText>
                <AppText align="right" style={{ color: colors.textSecondary }}>
                  {drop?.name || booking.toCity.name}
                </AppText>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <AppText style={{ flex: 1 }}>
                {t("pax.seats")}: {seats.map((seat) => seat.seatNo).join(", ")}
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet("details")}
              >
                <AppText
                  style={{
                    color: colors.primary,
                    textDecorationLine: "underline",
                  }}
                >
                  {t("pax.view_details")}
                </AppText>
              </Pressable>
            </View>
          </AppCard>
          <AppCard
            padding="base"
            variant="elevated"
            style={{ borderRadius: 24 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AppText variant="heading3" style={{ flex: 1 }}>
                {t("passenger.contact_title")}
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraftContact(contact);
                  setContactError("");
                  setSheet("contact");
                }}
              >
                <AppText style={{ color: colors.primary }}>
                  {t("pax.edit")}
                </AppText>
              </Pressable>
            </View>
            <AppText
              style={{
                color: colors.textSecondary,
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              {t("passenger.contact_subtitle")}
            </AppText>
            <AppText>+91 {contact.phone || "—"}</AppText>
            <AppText style={{ marginTop: 8 }}>
              {contact.email || t("pax.add_email")}
            </AppText>
            <AppText style={{ marginTop: 8 }}>
              {contact.state
                ? t(`state.${contact.state}`)
                : t("pax.required_state")}
            </AppText>
          </AppCard>
          <AppCard
            padding="base"
            variant="elevated"
            style={{ borderRadius: 24 }}
          >
            <AppText variant="heading3">{t("pax.passenger_details")}</AppText>
            <AppText
              style={{
                color: colors.textSecondary,
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              {t("pax.selected_count", {
                selected: selectedCount,
                total: seats.length,
              })}
            </AppText>
            {!authenticated ? (
              <AppButton
                title={t("account.login")}
                onPress={() => router.push("/(auth)/login")}
              />
            ) : query.isPending ? (
              <PassengersSkeleton />
            ) : (
              <>
                {query.isError && (
                  <PassengerError
                    onRetry={() => {
                      void query.refetch();
                    }}
                  />
                )}
                {passengers.length === 0 && !query.isError && (
                  <AppText
                    style={{ color: colors.textSecondary, marginBottom: 16 }}
                  >
                    {t("pax.empty")}
                  </AppText>
                )}
                {passengers.map((passenger) => {
                  const index = assignments.indexOf(passenger.id);
                  const selected = index >= 0;
                  return (
                    <Pressable
                      key={passenger.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggle(passenger)}
                      disabled={hold.isPending}
                      style={{
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primarySoft
                          : colors.surface,
                        borderRadius: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Ionicons
                        name={selected ? "checkbox" : "square-outline"}
                        size={24}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyMedium">{passenger.name}</AppText>
                        <AppText style={{ color: colors.textSecondary }}>
                          {t(`pax.gender_${passenger.gender}`)},{" "}
                          {t("pax.years", {
                            age: passengerAge(
                              passenger,
                              new Date(`${journeyDate}T12:00:00`),
                            ),
                          })}
                        </AppText>
                        {selected && (
                          <AppText
                            style={{ color: colors.primary, marginTop: 4 }}
                          >
                            {t("pax.seat_assignment", {
                              seat: seats[index]?.seatNo,
                            })}
                          </AppText>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
                <AppButton
                  title={t("pax.add_passengers")}
                  onPress={() => setSheet("add")}
                  variant="secondary"
                  fullWidth
                  disabled={hold.isPending}
                />
              </>
            )}
          </AppCard>
          <AppCard
            padding="base"
            variant="elevated"
            style={{ borderRadius: 24 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AppText variant="bodyMedium" style={{ flex: 1 }}>
                {t("passenger.gst_toggle")}
              </AppText>
              <Switch
                accessibilityLabel={t("passenger.gst_toggle")}
                value={hasGst}
                onValueChange={setHasGst}
                disabled={hold.isPending}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            {hasGst && (
              <View style={{ marginTop: 24 }}>
                <AppInput
                  label={t("passenger.gstin")}
                  value={gst.gstin}
                  onChangeText={(gstin) =>
                    setGst((current) => ({
                      ...current,
                      gstin: gstin.toUpperCase(),
                    }))
                  }
                  autoCapitalize="characters"
                  maxLength={15}
                />
                <AppInput
                  label={t("passenger.gst_company")}
                  value={gst.gstCompany}
                  onChangeText={(gstCompany) =>
                    setGst((current) => ({ ...current, gstCompany }))
                  }
                  maxLength={100}
                />
                <AppInput
                  label={t("pax.business_address")}
                  value={gst.businessAddress}
                  onChangeText={(businessAddress) =>
                    setGst((current) => ({ ...current, businessAddress }))
                  }
                  multiline
                  maxLength={500}
                />
                <AppInput
                  label={t("pax.business_email")}
                  value={gst.email}
                  onChangeText={(email) =>
                    setGst((current) => ({ ...current, email }))
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={254}
                />
              </View>
            )}
          </AppCard>
          {error ? <PassengerError message={error} /> : null}
        </ScrollView>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <AppText>{t("pax.amount")}</AppText>
            <AppText variant="heading3">
              ₹
              {seats
                .reduce((sum, seat) => sum + seat.fare, 0)
                .toLocaleString(locale)}
            </AppText>
          </View>
          <AppButton
            title={t(
              hold.isPending ? "pax.securing" : "passenger.proceed_review",
            )}
            onPress={() => {
              void proceed();
            }}
            loading={hold.isPending}
            disabled={query.isPending && authenticated}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
      <PassengerSheet
        visible={sheet === "details"}
        title={t("pax.booking_details")}
        onClose={() => setSheet(null)}
      >
        <ScrollView contentContainerStyle={{ gap: 20 }}>
          <View>
            <AppText variant="heading3">{busName}</AppText>
            <AppText style={{ color: colors.textSecondary }}>{busType}</AppText>
            <AppText>{date}</AppText>
          </View>
          {[
            { label: t("pax.pickup"), point: pickup },
            { label: t("pax.drop"), point: drop },
          ].map(({ label, point }) => (
            <View
              key={label}
              style={{
                borderLeftWidth: 3,
                borderColor: colors.primary,
                paddingLeft: 16,
                gap: 4,
              }}
            >
              <AppText style={{ color: colors.textSecondary }}>
                {label} · {point?.time}
              </AppText>
              <AppText variant="bodyMedium">{point?.name || "—"}</AppText>
              {point?.address && <AppText>{point.address}</AppText>}
              {point?.landmark && <AppText>{point.landmark}</AppText>}
              {point?.contact && <AppText>{point.contact}</AppText>}
            </View>
          ))}
          <AppText variant="heading3">{t("pax.seats")}</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {seats.map((seat) => (
              <View
                key={seat.seatNo}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.primarySoft,
                }}
              >
                <AppText>
                  {seat.seatNo} ·{" "}
                  {t(seat.deck === 2 ? "pax.upper_deck" : "pax.lower_deck")}
                </AppText>
              </View>
            ))}
          </View>
        </ScrollView>
      </PassengerSheet>
      <PassengerSheet
        visible={sheet === "contact"}
        title={t("passenger.contact_title")}
        onClose={() => setSheet(null)}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <AppInput
            label={t("passenger.phone")}
            value={draftContact.phone}
            onChangeText={(phone) =>
              setDraftContact((current) => ({ ...current, phone }))
            }
            keyboardType="phone-pad"
            maxLength={10}
          />
          <AppInput
            label={t("passenger.email")}
            value={draftContact.email}
            onChangeText={(email) =>
              setDraftContact((current) => ({ ...current, email }))
            }
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={254}
          />
          <StatePicker
            value={draftContact.state}
            onChange={(state) =>
              setDraftContact((current) => ({ ...current, state }))
            }
          />
          {contactError ? <PassengerError message={contactError} /> : null}
          <AppButton
            title={t("common.save")}
            fullWidth
            onPress={() => {
              const invalid = validateContact(draftContact);
              if (invalid) {
                setContactError(invalid);
                return;
              }
              setContact(draftContact);
              setSheet(null);
            }}
          />
        </ScrollView>
      </PassengerSheet>
      <PassengerSheet
        visible={sheet === "add"}
        title={t("pax.new")}
        onClose={() => setSheet(null)}
        busy={save.isPending}
      >
        {sheet === "add" && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <PassengerForm
              quick
              pending={save.isPending}
              onSave={async (input) => {
                const passenger = await save.mutateAsync(input);
                setSheet(null);
                toggle(passenger);
              }}
            />
          </ScrollView>
        )}
      </PassengerSheet>
    </SafeAreaView>
  );
}
