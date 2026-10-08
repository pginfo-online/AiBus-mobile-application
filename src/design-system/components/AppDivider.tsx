import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';

export interface AppDividerProps {
  vertical?: boolean;
  spacingMargin?: 'none' | 'xs' | 'sm' | 'md' | 'base' | 'lg';
  style?: ViewStyle;
}

export const AppDivider: React.FC<AppDividerProps> = ({
  vertical = false,
  spacingMargin = 'sm',
  style,
}) => {
  const { colors, spacing } = useAppTheme();

  const marginValues = {
    none: 0,
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    base: spacing.base,
    lg: spacing.lg,
  };

  const currentMargin = marginValues[spacingMargin];

  if (vertical) {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.border,
            marginHorizontal: currentMargin,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.divider,
          marginVertical: currentMargin,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
