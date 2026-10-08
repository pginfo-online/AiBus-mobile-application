import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppDivider,
  AppSectionHeader,
  AppBadge,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore } from '../../stores/bookingStore';
import { useAppStore, RouteSearchItem } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t, language } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    fromCity,
    toCity,
    journeyDate,
    setJourneyDate,
    setFromCity,
    setToCity,
    swapCities,
  } = useBookingStore();

  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);

  // Animated swap rotation
  const swapRotation = useSharedValue(0);

  const animatedSwapStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${swapRotation.value}deg` }],
    };
  });

  const handleSwap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
    swapRotation.value = withSpring(swapRotation.value + 180, {
      damping: 12,
      stiffness: 120,
    });
    swapCities();
  };

  // Date calculation helpers
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const isToday = journeyDate === todayStr;
  const isTomorrow = journeyDate === tomorrowStr;

  const formattedDate = useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(
        language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
        {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );
    } catch {
      return journeyDate;
    }
  }, [journeyDate, language]);

  const handleSearchBuses = () => {
    if (!fromCity || !toCity) {
      Alert.alert('Incomplete Search', 'Please select both origin and destination cities.');
      return;
    }

    if (fromCity.providerCityId === toCity.providerCityId) {
      Alert.alert('Invalid Selection', 'Origin and Destination cities cannot be the same.');
      return;
    }

    addRecentSearch({
      fromCityId: fromCity.providerCityId,
      fromCityName: fromCity.name,
      toCityId: toCity.providerCityId,
      toCityName: toCity.name,
    });

    router.push('/search/buses' as any);
  };

  const handleQuickRouteSelect = (route: RouteSearchItem) => {
    setFromCity({
      id: `c-${route.fromCityId}`,
      providerCityId: route.fromCityId,
      name: route.fromCityName,
    });
    setToCity({
      id: `c-${route.toCityId}`,
      providerCityId: route.toCityId,
      name: route.toCityName,
    });
  };

  // Wallet balance formatting
  const walletAmount = user?.walletBalance ? Number(user.walletBalance).toFixed(2) : '0.00';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar: Logo & Wallet Balance */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
              },
            ]}
          >
            <Ionicons name="bus" size={20} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: spacing.sm }}>
            <AppText variant="heading2" style={{ color: colors.primary, letterSpacing: -0.5 }}>
              Ai<AppText variant="heading2" style={{ color: colors.text }}>Bus</AppText>
            </AppText>
          </View>
        </View>

        {/* Wallet Balance Pill */}
        <Pressable
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/(auth)/login' as any);
            } else {
              router.push('/(tabs)/account' as any);
            }
          }}
          style={({ pressed }) => [
            styles.walletPill,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primaryBorder,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Wallet balance: ₹${walletAmount}`}
        >
          <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          <View style={{ marginLeft: 6 }}>
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              ₹{walletAmount}
            </AppText>
          </View>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base }]}
      >
        {/* 2. Main Search Card */}
        <AppCard variant="elevated" padding="base" style={[styles.searchCard, shadows.md]}>
          {/* Origin (From) */}
          <Pressable
            onPress={() => router.push('/search/from-city' as any)}
            style={({ pressed }) => [
              styles.citySelectRow,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.from')}: ${fromCity.name}`}
          >
            <View style={styles.pinIconWrapper}>
              <Ionicons name="radio-button-on" size={20} color={colors.primary} />
            </View>
            <View style={styles.cityTextContainer}>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('home.from')}
              </AppText>
              <AppText variant="heading3" style={{ color: colors.text, marginTop: 2 }}>
                {fromCity.name}
              </AppText>
            </View>
          </Pressable>

          {/* Swap Divider with Action */}
          <View style={styles.swapDividerRow}>
            <View style={[styles.swapDividerLine, { backgroundColor: colors.border }]} />
            <Pressable
              onPress={handleSwap}
              style={[
                styles.swapButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('home.swap_cities')}
            >
              <Animated.View style={animatedSwapStyle}>
                <Ionicons name="swap-vertical" size={20} color={colors.primary} />
              </Animated.View>
            </Pressable>
          </View>

          {/* Destination (To) */}
          <Pressable
            onPress={() => router.push('/search/to-city' as any)}
            style={({ pressed }) => [
              styles.citySelectRow,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.to')}: ${toCity.name}`}
          >
            <View style={styles.pinIconWrapper}>
              <Ionicons name="location-sharp" size={20} color={colors.danger} />
            </View>
            <View style={styles.cityTextContainer}>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('home.to')}
              </AppText>
              <AppText variant="heading3" style={{ color: colors.text, marginTop: 2 }}>
                {toCity.name}
              </AppText>
            </View>
          </Pressable>

          <AppDivider spacingMargin="sm" />

          {/* Date Picker Section */}
          <View style={styles.dateSection}>
            <View style={styles.dateHeaderRow}>
              <View style={styles.dateLabelRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <AppText
                  variant="bodySmallMedium"
                  style={{ color: colors.textSecondary, marginLeft: 6 }}
                >
                  {t('home.date')}
                </AppText>
              </View>

              {/* Quick Date Presets */}
              <View style={styles.quickDateRow}>
                <Pressable
                  onPress={() => setJourneyDate(todayStr)}
                  style={[
                    styles.quickDatePill,
                    {
                      backgroundColor: isToday ? colors.primary : colors.surfaceSecondary,
                      borderColor: isToday ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isToday ? '#FFFFFF' : colors.text,
                      fontWeight: '600',
                    }}
                  >
                    {t('home.today')}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => setJourneyDate(tomorrowStr)}
                  style={[
                    styles.quickDatePill,
                    {
                      backgroundColor: isTomorrow ? colors.primary : colors.surfaceSecondary,
                      borderColor: isTomorrow ? colors.primary : colors.border,
                      marginLeft: 6,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isTomorrow ? '#FFFFFF' : colors.text,
                      fontWeight: '600',
                    }}
                  >
                    {t('home.tomorrow')}
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Selected Date Display */}
            <View style={[styles.dateDisplayBox, { backgroundColor: colors.surfaceSecondary }]}>
              <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                {formattedDate}
              </AppText>
            </View>
          </View>

          {/* Search CTA */}
          <AppButton
            title={t('home.search_buses')}
            onPress={handleSearchBuses}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: spacing.base }}
            icon={<Ionicons name="search" size={20} color="#FFFFFF" />}
          />
        </AppCard>

        {/* 3. Popular / Recent Routes */}
        <View style={{ marginTop: spacing.xl }}>
          <AppSectionHeader
            title={t('home.popular_routes')}
            subtitle="Frequently traveled corridors"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routesScroll}>
            {recentSearches.map((route, idx) => (
              <Pressable
                key={`${route.fromCityId}-${route.toCityId}-${idx}`}
                onPress={() => handleQuickRouteSelect(route)}
                style={({ pressed }) => [
                  styles.routeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.routePillHeader}>
                  <Ionicons name="flash" size={14} color={colors.accentGold} />
                  <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                    Express
                  </AppText>
                </View>
                <AppText variant="bodyMedium" style={{ color: colors.text, marginTop: 4 }}>
                  {route.fromCityName} → {route.toCityName}
                </AppText>
                <AppText variant="caption" style={{ color: colors.primary, marginTop: 2, fontWeight: '600' }}>
                  Daily buses available
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 4. Assurance & Benefits Banner */}
        <View style={[styles.assuranceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.md }}>
            Why Book with AiBus?
          </AppText>
          <View style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <AppText variant="bodyMedium" style={{ color: colors.text }}>
                Instant Refund Guarantee
              </AppText>
              <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                Cancellations refunded straight to your payment method
              </AppText>
            </View>
          </View>

          <View style={[styles.benefitRow, { marginTop: spacing.md }]}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.infoSoft }]}>
              <Ionicons name="navigate-circle" size={20} color={colors.info} />
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <AppText variant="bodyMedium" style={{ color: colors.text }}>
                Real-Time Bus Tracking
              </AppText>
              <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                Track your bus live from departure to dropping point
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  searchCard: {
    width: '100%',
  },
  citySelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pinIconWrapper: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  swapDividerRow: {
    position: 'relative',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapDividerLine: {
    position: 'absolute',
    left: 44,
    right: 0,
    height: 1,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 16,
    zIndex: 2,
    elevation: 3,
  },
  dateSection: {
    marginTop: 8,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickDateRow: {
    flexDirection: 'row',
  },
  quickDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateDisplayBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  routesScroll: {
    marginTop: 8,
  },
  routeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 180,
  },
  routePillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assuranceCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
