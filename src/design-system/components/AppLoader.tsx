import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

export interface AppLoaderProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  message,
  size = 'large',
  style,
}) => {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <AppText
          variant="bodyMedium"
          align="center"
          style={{
            marginTop: spacing.md,
            color: colors.textSecondary,
          }}
        >
          {message}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
