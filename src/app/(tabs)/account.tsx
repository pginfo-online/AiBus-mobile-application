import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, ColorThemeMode } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppDivider,
  AppBadge,
} from '../../design-system';
import { useTranslation, SupportedLanguage } from '../../core/localization';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';

export default function AccountScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows, isDark } = useAppTheme();
  const { t, language, setLanguage } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const walletAmount = user?.walletBalance ? Number(user.walletBalance).toFixed(2) : '0.00';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="heading2" style={{ color: colors.text }}>
          {t('account.title')}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 40 }]}
      >
        {/* 2. User Profile Card / Login Prompt */}
        {isAuthenticated && user ? (
          <AppCard variant="elevated" padding="base" style={[styles.profileCard, shadows.sm]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <AppText variant="heading2" style={{ color: '#FFFFFF' }}>
                  {user.firstName.charAt(0).toUpperCase()}
                </AppText>
              </View>

              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <AppText variant="heading3" style={{ color: colors.text }}>
                  {user.firstName} {user.lastName}
                </AppText>
                <AppText variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                  {user.email}
                </AppText>
                {user.phone && (
                  <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 1 }}>
                    {user.phone}
                  </AppText>
                )}
              </View>

              <AppBadge label="Verified" variant="success" size="sm" />
            </View>

            <AppDivider spacingMargin="md" />

            {/* Wallet Balance Widget */}
            <View style={[styles.walletBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                <AppText variant="bodyMedium" style={{ color: colors.text, marginLeft: 8 }}>
                  {t('account.wallet_balance')}
                </AppText>
              </View>
              <AppText variant="priceMedium" style={{ color: colors.primary }}>
                ₹{walletAmount}
              </AppText>
            </View>
          </AppCard>
        ) : (
          <AppCard variant="elevated" padding="base" style={[styles.loginPromptCard, shadows.sm]}>
            <View style={[styles.loginIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="person-circle" size={44} color={colors.primary} />
            </View>
            <AppText variant="heading3" style={{ color: colors.text, marginTop: spacing.sm }}>
              Welcome to AiBus
            </AppText>
            <AppText variant="bodySmall" align="center" style={{ color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md }}>
              Log in to view your bookings, check wallet balance, and save passenger details.
            </AppText>

            <AppButton
              title={t('account.login')}
              onPress={() => router.push('/(auth)/login' as any)}
              variant="primary"
              size="md"
              fullWidth
            />
          </AppCard>
        )}

        {/* 3. Language Selector Section */}
        <AppCard variant="outlined" padding="base" style={[styles.sectionCard, { marginTop: spacing.base }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="language-outline" size={20} color={colors.primary} />
            <AppText variant="heading3" style={{ color: colors.text, marginLeft: 8 }}>
              {t('account.language')}
            </AppText>
          </View>

          <View style={styles.choiceRow}>
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिंदी (Hindi)' },
              { code: 'mr', label: 'मराठी (Marathi)' },
            ].map((lang) => {
              const isSelected = language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => setLanguage(lang.code as SupportedLanguage)}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="bodySmallMedium"
                    style={{
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {lang.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        {/* 4. Appearance (Light / Dark Theme) */}
        <AppCard variant="outlined" padding="base" style={[styles.sectionCard, { marginTop: spacing.base }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} />
            <AppText variant="heading3" style={{ color: colors.text, marginLeft: 8 }}>
              {t('account.theme')}
            </AppText>
          </View>

          <View style={styles.choiceRow}>
            {[
              { mode: 'light', label: t('account.theme_light'), icon: 'sunny-outline' },
              { mode: 'dark', label: t('account.theme_dark'), icon: 'moon-outline' },
              { mode: 'system', label: t('account.theme_system'), icon: 'phone-portrait-outline' },
            ].map((theme) => {
              const isSelected = themeMode === theme.mode;
              return (
                <Pressable
                  key={theme.mode}
                  onPress={() => setThemeMode(theme.mode as ColorThemeMode)}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={theme.icon as any}
                    size={16}
                    color={isSelected ? colors.primary : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <AppText
                    variant="bodySmallMedium"
                    style={{
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {theme.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        {/* 5. Support & Legal Links */}
        <AppCard variant="outlined" padding="none" style={[styles.sectionCard, { marginTop: spacing.base }]}>
          <Pressable
            onPress={() => router.navigate('/(tabs)/bookings' as any)}
            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
              <AppText variant="bodyMedium" style={{ color: colors.text, marginLeft: 12 }}>
                My Bookings
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => router.navigate('/(tabs)/help' as any)}
            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
              <AppText variant="bodyMedium" style={{ color: colors.text, marginLeft: 12 }}>
                {t('account.help')}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </AppCard>

        {/* 6. Logout Button */}
        {isAuthenticated && (
          <AppButton
            title={t('account.logout')}
            onPress={handleLogout}
            variant="outline"
            size="lg"
            fullWidth
            style={{ marginTop: spacing.xl }}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />}
            textStyle={{ color: colors.danger }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  profileCard: {
    width: '100%',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  loginPromptCard: {
    alignItems: 'center',
    width: '100%',
  },
  loginIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCard: {
    width: '100%',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
