import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../theme';

export interface AppIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface' | 'primary';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel: string;
}

export const AppIconButton: React.FC<AppIconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, radii } = useAppTheme();

  const handlePress = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback
    }
    onPress();
  };

  const dimensions = {
    sm: 32,
    md: 40,
    lg: 48,
  }[size];

  let bg = 'transparent';
  let border = 'transparent';

  if (variant === 'surface') {
    bg = colors.surfaceSecondary;
    border = colors.border;
  } else if (variant === 'primary') {
    bg = colors.primary;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        {
          width: dimensions,
          height: dimensions,
          borderRadius: radii.full,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'surface' ? 1 : 0,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
