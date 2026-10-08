import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../design-system/theme';

export default function Index() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const { colors } = useAppTheme();

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={'/(tabs)/home' as any} />;
}
