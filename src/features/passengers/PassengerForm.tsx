import React, { useRef, useState } from "react";
import { View } from "react-native";
import { AppButton, AppInput, AppText } from "../../design-system";
import { useTranslation } from "../../core/localization";
import { UserProfile } from "../../stores/authStore";
import { useAppTheme } from "../../design-system/theme";
import {
  GenderPicker,
  PassengerError,
  StatePicker,
} from "./PassengerComponents";
import {
  PassengerGender,
  PassengerInput,
  SavedPassenger,
  validBirthDate,
  validEmail,
  validMobile,
} from "./passengerModel";
import { isValidBookingName } from "../booking/bookingName";
import { PersonalInput } from "./usePassengers";

export function PassengerForm({
  passenger,
  personal,
  quick = false,
  pending,
  onSave,
}: {
  passenger?: SavedPassenger;
  personal?: UserProfile;
  quick?: boolean;
  pending: boolean;
  onSave: (input: PassengerInput, profile?: PersonalInput) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [name, setName] = useState(
    passenger?.name ||
      [personal?.firstName, personal?.lastName].filter(Boolean).join(" "),
  );
  const [birth, setBirth] = useState(
    (passenger?.dateOfBirth || personal?.dateOfBirth || "").slice(0, 10),
  );
  const [age, setAge] = useState(passenger?.age ? String(passenger.age) : "");
  const [gender, setGender] = useState<PassengerGender | null>(
    passenger?.gender || personal?.gender || null,
  );
  const [mobile, setMobile] = useState(
    passenger?.mobile || personal?.personalPhone || personal?.phone || "",
  );
  const [state, setState] = useState(personal?.state || "");
  const [email, setEmail] = useState(
    personal?.contactEmail ??
      (personal?.email?.endsWith("@mobile.aibus.app") ? "" : personal?.email) ??
      "",
  );
  const [error, setError] = useState("");
  const saving = useRef(false);
  const save = async () => {
    if (pending || saving.current) return;
    if (
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !isValidBookingName(name)
    )
      return setError(t("pax.invalid_name"));
    if (!gender) return setError(t("pax.invalid_gender"));
    if (
      quick
        ? !/^\d{1,3}$/.test(age) || Number(age) < 1 || Number(age) > 120
        : !validBirthDate(birth)
    )
      return setError(t(quick ? "pax.invalid_age" : "pax.invalid_dob"));
    if ((personal && !validMobile(mobile)) || (mobile && !validMobile(mobile)))
      return setError(t("pax.invalid_mobile"));
    if (personal && !state) return setError(t("pax.required_state"));
    if (email && !validEmail(email)) return setError(t("pax.invalid_email"));
    setError("");
    saving.current = true;
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      await onSave(
        {
          name: name.trim(),
          gender,
          mobile: mobile || null,
          ...(quick ? { age: Number(age) } : { dateOfBirth: birth }),
        },
        personal
          ? {
              firstName,
              lastName: rest.join(" "),
              gender,
              dateOfBirth: birth,
              personalPhone: mobile,
              contactEmail: email.trim().toLowerCase() || null,
              state,
            }
          : undefined,
      );
    } catch {
      setError(t("pax.save_error"));
    } finally {
      saving.current = false;
    }
  };
  return (
    <View>
      <AppText variant="heading3" style={{ marginBottom: 24 }}>
        {t("pax.personal_details")}
      </AppText>
      <AppInput
        label={t("passenger.name")}
        accessibilityLabel={t("passenger.name")}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={100}
        editable={!pending}
      />
      {quick ? (
        <AppInput
          label={t("passenger.age")}
          accessibilityLabel={t("passenger.age")}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          maxLength={3}
          editable={!pending}
        />
      ) : (
        <AppInput
          label={t("pax.dob")}
          accessibilityLabel={t("pax.dob")}
          helperText={t("pax.dob_format")}
          placeholder="YYYY-MM-DD"
          value={birth}
          onChangeText={setBirth}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          editable={!pending}
        />
      )}
      <GenderPicker value={gender} onChange={setGender} />
      {!quick && (
        <>
          <AppText style={{ color: colors.textSecondary, marginBottom: 16 }}>
            {t(personal ? "pax.contact_mobile_hint" : "pax.mobile_hint")}
          </AppText>
          <AppInput
            label={t("passenger.phone")}
            accessibilityLabel={t("passenger.phone")}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!pending}
          />
          {personal && (
            <>
              <StatePicker value={state} onChange={setState} />
              <AppInput
                label={t("pax.optional_email")}
                accessibilityLabel={t("pax.optional_email")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={254}
                editable={!pending}
              />
            </>
          )}
        </>
      )}
      {error ? <PassengerError message={error} /> : null}
      <AppButton
        title={t(
          quick
            ? "pax.add_to_list"
            : personal
              ? "common.save"
              : passenger
                ? "pax.save_changes"
                : "pax.add_passengers",
        )}
        onPress={save}
        loading={pending}
        fullWidth
        size="lg"
      />
    </View>
  );
}
