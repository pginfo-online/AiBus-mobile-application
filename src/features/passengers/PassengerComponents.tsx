import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { AppButton, AppInput, AppText } from "../../design-system";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";
import { INDIAN_STATES } from "./indianStates";
import { PassengerGender } from "./passengerModel";

export function PassengerHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/account")
          }
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="heading3">{title}</AppText>
          {subtitle && (
            <AppText color={colors.textSecondary}>{subtitle}</AppText>
          )}
        </View>
      </View>
    </>
  );
}
export function PassengerPage({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <PassengerHeader title={title} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 20, flexGrow: 1 }}
        >
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function PassengerSheet({
  visible,
  title,
  onClose,
  children,
  busy = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          accessibilityLabel={t("pax.close")}
          disabled={busy}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "88%",
            minHeight: 260,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: colors.surface,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <AppText variant="heading3" style={{ flex: 1 }}>
              {title}
            </AppText>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("pax.close")}
              onPress={onClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function StatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (state: string) => void;
}) {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const label = (state: string) => t(`state.${state}`);
  const states = useMemo(
    () =>
      INDIAN_STATES.filter((state) =>
        `${state} ${t(`state.${state}`)}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
      ),
    [search, t],
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("pax.state")}
        onPress={() => {
          setSearch("");
          setVisible(true);
        }}
        style={{
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <AppText>{value ? label(value) : t("pax.state")}</AppText>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
      <PassengerSheet
        visible={visible}
        title={t("pax.state")}
        onClose={() => setVisible(false)}
      >
        <AppInput
          accessibilityLabel={t("pax.search_states")}
          placeholder={t("pax.search_states")}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <FlatList
          style={{ maxHeight: 380 }}
          data={states}
          extraData={`${value}-${language}`}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText>{t("pax.no_states")}</AppText>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: item === value }}
              onPress={() => {
                onChange(item);
                setVisible(false);
              }}
              style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <AppText style={{ flex: 1 }}>{label(item)}</AppText>
              {item === value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          )}
        />
      </PassengerSheet>
    </>
  );
}
export function GenderPicker({
  value,
  onChange,
}: {
  value?: PassengerGender | null;
  onChange: (value: PassengerGender) => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
    <View style={{ gap: 8, marginBottom: 20 }}>
      <AppText color={colors.textSecondary}>{t("passenger.gender")}</AppText>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {(["M", "F", "O"] as const).map((gender) => (
          <Pressable
            key={gender}
            accessibilityRole="radio"
            accessibilityState={{ checked: gender === value }}
            onPress={() => onChange(gender)}
            style={{
              flexGrow: 1,
              padding: 14,
              borderWidth: 1,
              borderRadius: 24,
              borderColor: gender === value ? colors.primary : colors.border,
              backgroundColor:
                gender === value ? colors.primarySoft : colors.surface,
            }}
          >
            <AppText align="center">
              {t(`pax.gender_${gender}`)} {gender === value ? "◉" : "○"}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function PassengerError({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: 12, paddingVertical: 16 }}
    >
      <AppText color={colors.danger}>{message || t("pax.load_error")}</AppText>
      {onRetry && (
        <AppButton
          title={t("common.retry")}
          onPress={onRetry}
          variant="outline"
        />
      )}
    </View>
  );
}
export function PassengersSkeleton({ form = false }: { form?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let alive = true;
    let loop: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      loop?.stop();
      opacity.setValue(1);
      if (reduced || !alive) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.45,
            duration: 800,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      );
      loop.start();
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (alive) update(reduced);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      update,
    );
    return () => {
      alive = false;
      subscription.remove();
      loop?.stop();
    };
  }, [opacity]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.loading")}
      accessibilityState={{ busy: true }}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ opacity, gap: 18 }}
      >
        {[0, 1, 2, 3].map((key) => (
          <View
            key={key}
            style={{
              padding: 18,
              borderRadius: 20,
              backgroundColor: colors.surface,
              flexDirection: "row",
              gap: 16,
            }}
          >
            {!form && (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.shimmerBase,
                }}
              />
            )}
            <View style={{ flex: 1, gap: 10 }}>
              <View
                style={{
                  height: form ? 48 : 18,
                  width: "75%",
                  backgroundColor: colors.shimmerBase,
                  borderRadius: 8,
                }}
              />
              <View
                style={{
                  height: 14,
                  width: "45%",
                  backgroundColor: colors.shimmerBase,
                  borderRadius: 8,
                }}
              />
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
