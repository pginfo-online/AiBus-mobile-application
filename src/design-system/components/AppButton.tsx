import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  testID?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  hapticFeedback = true,
  testID,
}) => {
  const { colors, spacing, radii } = useAppTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Safe fallback on platforms without haptics
      }
    }
    onPress();
  };

  // Dimensions based on size
  const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: TextStyle['fontSize'] }> = {
    sm: { height: 36, paddingHorizontal: spacing.md, fontSize: 13 },
    md: { height: 48, paddingHorizontal: spacing.base, fontSize: 15 },
    lg: { height: 54, paddingHorizontal: spacing.xl, fontSize: 16 },
  };

  const currentSize = sizeStyles[size];

  // Visual variants
  let backgroundColor: string = colors.primary;
  let borderColor: string = 'transparent';
  let borderWidth = 0;
  let textColor: string = colors.textInverse;

  switch (variant) {
    case 'primary':
      backgroundColor = colors.primary;
      textColor = '#FFFFFF';
      break;
    case 'secondary':
      backgroundColor = colors.surfaceSecondary;
      textColor = colors.text;
      break;
    case 'outline':
      backgroundColor = 'transparent';
      borderColor = colors.borderStrong;
      borderWidth = 1.5;
      textColor = colors.text;
      break;
    case 'ghost':
      backgroundColor = 'transparent';
      textColor = colors.primary;
      break;
    case 'danger':
      backgroundColor = colors.danger;
      textColor = '#FFFFFF';
      break;
  }

  if (disabled) {
    backgroundColor = colors.surfaceSecondary;
    borderColor = 'transparent';
    textColor = colors.textMuted;
  }

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: radii.md,
          opacity: pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconMargin}>{icon}</View>}
          <AppText
            variant="button"
            style={[
              {
                color: textColor,
                fontSize: currentSize.fontSize,
              },
              textStyle as any,
            ]}
          >
            {title}
          </AppText>
          {rightIcon && <View style={styles.rightIconMargin}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginRight: 8,
  },
  rightIconMargin: {
    marginLeft: 8,
  },
});
