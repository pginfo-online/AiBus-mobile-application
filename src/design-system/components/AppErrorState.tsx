import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { DomainError } from '../../core/errors';

export interface AppErrorStateProps {
  error: DomainError | string | Error | unknown;
  title?: string;
  onRetry?: () => void;
  retryTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppErrorState: React.FC<AppErrorStateProps> = ({
  error,
  title = 'Something went wrong',
  onRetry,
  retryTitle = 'Try Again',
  style,
}) => {
  const { colors, spacing } = useAppTheme();

  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.';

  const isNetwork =
    error instanceof DomainError && error.category === 'NETWORK';

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.dangerSoft,
            borderColor: colors.dangerBorder,
            marginBottom: spacing.base,
          },
        ]}
      >
        <Ionicons
          name={isNetwork ? 'wifi-outline' : 'alert-circle-outline'}
          size={40}
          color={colors.danger}
        />
      </View>

      <AppText
        variant="heading3"
        align="center"
        style={{ marginBottom: spacing.xs, color: colors.text }}
      >
        {isNetwork ? 'No Connection' : title}
      </AppText>

      <AppText
        variant="body"
        align="center"
        style={{
          color: colors.textSecondary,
          marginBottom: onRetry ? spacing.lg : 0,
          maxWidth: 320,
        }}
      >
        {errorMessage}
      </AppText>

      {onRetry && (
        <AppButton
          title={retryTitle}
          onPress={onRetry}
          variant="primary"
          size="md"
          icon={<Ionicons name="reload-outline" size={18} color="#FFFFFF" />}
        />
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
