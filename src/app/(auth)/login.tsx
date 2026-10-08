import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppInput,
  AppDivider,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useLoginMutation } from '../../features/auth/useAuthMutations';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useLoginMutation();

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 1) {
      Alert.alert('Validation Error', 'Please enter your password.');
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert('Success', 'Logged in successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Incorrect email or password.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base }]}
      >
        <AppCard variant="elevated" padding="lg" style={[styles.card, shadows.md]}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="bus" size={32} color={colors.primary} />
          </View>

          <AppText variant="heading1" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
            Welcome Back
          </AppText>
          <AppText
            variant="body"
            align="center"
            style={{ color: colors.textSecondary, marginTop: 4, marginBottom: spacing.xl }}
          >
            Log in to access your bus bookings & wallet
          </AppText>

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. rahul@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            isPassword
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          />

          <AppButton
            title="Log In"
            onPress={handleLogin}
            variant="primary"
            size="lg"
            fullWidth
            loading={loginMutation.isPending}
            style={{ marginTop: spacing.base }}
          />

          <AppDivider spacingMargin="lg" />

          {/* Quick link to Sign Up */}
          <View style={styles.switchRow}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              Don't have an account?{' '}
            </AppText>
            <Pressable onPress={() => router.replace('/(auth)/signup' as any)}>
              <AppText variant="bodyLargeBold" style={{ color: colors.primary }}>
                Sign Up
              </AppText>
            </Pressable>
          </View>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
