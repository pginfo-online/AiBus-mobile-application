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
import { useRegisterMutation } from '../../features/auth/useAuthMutations';

export default function SignupScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = useRegisterMutation();

  const handleRegister = async () => {
    if (!firstName || firstName.trim().length < 2) {
      Alert.alert('Validation Error', 'First name must be at least 2 characters.');
      return;
    }

    if (!lastName || lastName.trim().length < 1) {
      Alert.alert('Validation Error', 'Last name is required.');
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    // Backend password requirement: min 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }

    try {
      await registerMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        password,
      });

      Alert.alert('Account Created', 'Welcome to AiBus! Your account is ready.', [
        {
          text: 'Get Started',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Email may already be registered.');
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
            <Ionicons name="person-add" size={30} color={colors.primary} />
          </View>

          <AppText variant="heading1" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
            Create Account
          </AppText>
          <AppText
            variant="body"
            align="center"
            style={{ color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg }}
          >
            Join India's smart intercity bus network
          </AppText>

          {/* First & Last Name */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. Rahul"
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Sharma"
                autoCapitalize="words"
              />
            </View>
          </View>

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
            label="Mobile Number (Optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={13}
            leftIcon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            isPassword
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          />

          <AppButton
            title="Create Account"
            onPress={handleRegister}
            variant="primary"
            size="lg"
            fullWidth
            loading={registerMutation.isPending}
            style={{ marginTop: spacing.base }}
          />

          <AppDivider spacingMargin="lg" />

          {/* Quick link to Log In */}
          <View style={styles.switchRow}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              Already have an account?{' '}
            </AppText>
            <Pressable onPress={() => router.replace('/(auth)/login' as any)}>
              <AppText variant="bodyLargeBold" style={{ color: colors.primary }}>
                Log In
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
