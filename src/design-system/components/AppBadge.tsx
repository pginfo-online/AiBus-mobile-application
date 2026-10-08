import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
}) => {
  const { colors, radii, spacing } = useAppTheme();

  let bg = colors.surfaceSecondary;
  let text = colors.textSecondary;
  let border = 'transparent';

  switch (variant) {
    case 'primary':
      bg = colors.primarySoft;
      text = colors.primary;
      border = colors.primaryBorder;
      break;
    case 'success':
      bg = colors.successSoft;
      text = colors.success;
      border = colors.successBorder;
      break;
    case 'warning':
      bg = colors.warningSoft;
      text = colors.warning;
      border = colors.warningBorder;
      break;
    case 'danger':
      bg = colors.dangerSoft;
      text = colors.danger;
      border = colors.dangerBorder;
      break;
    case 'info':
      bg = colors.infoSoft;
      text = colors.info;
      border = colors.infoBorder;
      break;
    case 'neutral':
      bg = colors.surfaceSecondary;
      text = colors.textSecondary;
      border = colors.border;
      break;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: radii.full,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      {icon && <View style={{ marginRight: 4 }}>{icon}</View>}
      <AppText
        variant="caption"
        style={{
          color: text,
          fontSize: isSmall ? 10 : 11,
          fontWeight: '600',
        }}
      >
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
