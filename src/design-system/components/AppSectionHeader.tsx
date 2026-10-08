import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

export interface AppSectionHeaderProps {
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const AppSectionHeader: React.FC<AppSectionHeaderProps> = ({
  title,
  subtitle,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.sm }, style]}>
      <View style={styles.textContainer}>
        <AppText variant="heading3" style={{ color: colors.text }}>
          {title}
        </AppText>
        {subtitle && (
          <AppText
            variant="bodySmall"
            style={{ color: colors.textSecondary, marginTop: 2 }}
          >
            {subtitle}
          </AppText>
        )}
      </View>

      {actionTitle && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText
            variant="bodySmallMedium"
            style={{ color: colors.primary, fontWeight: '600' }}
          >
            {actionTitle}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
});
