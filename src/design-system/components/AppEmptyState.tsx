import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

export interface AppEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            marginBottom: spacing.base,
          },
        ]}
      >
        {icon || <Ionicons name="bus-outline" size={40} color={colors.textMuted} />}
      </View>

      <AppText
        variant="heading3"
        align="center"
        style={{ marginBottom: spacing.xs, color: colors.text }}
      >
        {title}
      </AppText>

      <AppText
        variant="body"
        align="center"
        style={{
          color: colors.textSecondary,
          marginBottom: actionTitle ? spacing.lg : 0,
          maxWidth: 320,
        }}
      >
        {description}
      </AppText>

      {actionTitle && onAction && (
        <AppButton title={actionTitle} onPress={onAction} variant="primary" size="md" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minHeight: 280,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
