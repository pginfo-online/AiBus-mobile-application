import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../core/api/queryClient';
import { ThemeProvider, useAppTheme } from '../design-system/theme';
import { LanguageProvider } from '../core/localization';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';

function RootNavigationLayout() {
  const { colors, isDark } = useAppTheme();
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/login"
          options={{
            title: 'Log In',
            presentation: 'modal',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="(auth)/signup"
          options={{
            title: 'Create Account',
            presentation: 'modal',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="search/from-city"
          options={{
            title: 'Select Origin',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="search/to-city"
          options={{
            title: 'Select Destination',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="search/buses"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="booking/seat-map"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="booking/boarding-dropping"
          options={{
            title: 'Select Points',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="booking/passenger-details"
          options={{
            title: 'Passenger Details',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="booking/review"
          options={{
            title: 'Review Booking',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="booking/payment"
          options={{
            title: 'Select Payment Method',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="booking/processing"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ticket/[bookingId]"
          options={{
            title: 'Booking Confirmation',
            headerShown: true,
            headerBackVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const themeMode = useAppStore((s) => s.themeMode);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider themeMode={themeMode}>
            <LanguageProvider>
              <RootNavigationLayout />
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
