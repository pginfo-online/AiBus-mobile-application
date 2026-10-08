import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../theme';

export interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'base' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  onPress,
  variant = 'default',
  padding = 'base',
  style,
  testID,
}) => {
  const { colors, spacing, radii, shadows } = useAppTheme();

  const paddingValues = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    base: spacing.base,
    lg: spacing.lg,
  };

  const currentPadding = paddingValues[padding];

  let cardStyle: ViewStyle = {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.lg,
    padding: currentPadding,
  };

  if (variant === 'elevated') {
    cardStyle = {
      ...cardStyle,
      backgroundColor: colors.surfaceElevated,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
    };
  } else if (variant === 'outlined') {
    cardStyle = {
      ...cardStyle,
      borderWidth: 1.5,
      borderColor: colors.border,
    };
  } else {
    cardStyle = {
      ...cardStyle,
      borderWidth: 1,
      borderColor: colors.border,
    };
  }

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { opacity: pressed ? 0.92 : 1 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[cardStyle, style]}>
      {children}
    </View>
  );
};
