import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

export interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  count?: number;
  style?: ViewStyle;
}

export const AppChip: React.FC<AppChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  count,
  style,
}) => {
  const { colors, radii, spacing } = useAppTheme();

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.full,
          paddingVertical: 6,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon && <View style={styles.iconMargin}>{icon}</View>}
      <AppText
        variant="bodySmallMedium"
        style={{
          color: selected ? colors.primary : colors.text,
          fontWeight: selected ? '600' : '500',
        }}
      >
        {label}
      </AppText>
      {count !== undefined && (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
            },
          ]}
        >
          <AppText
            variant="caption"
            style={{
              color: selected ? '#FFFFFF' : colors.textSecondary,
              fontSize: 10,
              fontWeight: '700',
            }}
          >
            {count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  iconMargin: {
    marginRight: 6,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9999,
  },
});
