import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Platform, View } from "react-native";
import { useAppTheme } from "../../design-system/theme";
import { useTranslation } from "../../core/localization";

export function FlowSkeleton({
  kind = "ticket",
  count = 1,
}: {
  kind?: "ticket" | "card" | "cancellation";
  count?: number;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let alive = true;
    let animation: Animated.CompositeAnimation | undefined;
    const change = (reduced: boolean) => {
      animation?.stop();
      opacity.setValue(1);
      if (!alive || reduced) return;
      animation = Animated.loop(
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
      animation.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) change(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      change,
    );
    return () => {
      alive = false;
      sub.remove();
      animation?.stop();
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
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ opacity, gap: 16 }}
      >
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 20,
              gap: 16,
            }}
          >
            <View
              style={{
                height: kind === "ticket" ? 100 : 24,
                backgroundColor: colors.shimmerBase,
                borderRadius: 8,
              }}
            />
            {[0, 1, ...(kind === "ticket" ? [2, 3, 4] : [])].map((line) => (
              <View
                key={line}
                style={{
                  height: line % 2 ? 14 : 20,
                  width: line % 2 ? "60%" : "85%",
                  backgroundColor: colors.shimmerBase,
                  borderRadius: 6,
                }}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
