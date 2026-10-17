import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  AppDateSelectorModal,
  AppSectionHeader,
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
    isWomenBooking,
    setIsWomenBooking,
  } = useBookingStore();

  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);

  // Modals state
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'bus' | 'train' | 'hotel' | 'metro'>('bus');

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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const isToday = journeyDate === todayStr;
  const isTomorrow = journeyDate === tomorrowStr;

  // Format date like: "Sat 17-Oct" matching ref-1
  const formattedDate = useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-IN', { month: 'short' });
      return `${weekday} ${day}-${month}`;
    } catch {
      return journeyDate;
    }
  }, [journeyDate]);

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
  const walletAmount = user?.walletBalance ? Number(user.walletBalance).toFixed(0) : '0';

  const showWomenInfo = () => {
    Alert.alert(
      'Booking for Women',
      'When this is enabled, we prioritize female-reserved seat selections and provide women-friendly bus recommendations ensuring safety and comfort.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FDFBF7' }]} edges={['top']}>
      {/* 1. Header Bar matching ref-1: Logo on left, Wallet & My Account on right */}
      <View style={styles.topHeaderBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="bus" size={20} color="#FFFFFF" />
          </View>
          <AppText variant="heading2" style={styles.brandTitle}>
            Ai<AppText variant="heading2" style={{ color: '#0F172A' }}>Bus</AppText>
          </AppText>
        </View>

        <View style={styles.headerRightActions}>
          {/* Wallet Button */}
          <Pressable
            onPress={() => {
              if (!isAuthenticated) router.push('/(auth)/login' as any);
              else router.push('/(tabs)/account' as any);
            }}
            style={styles.headerPillButton}
            accessibilityRole="button"
            accessibilityLabel={`Wallet balance ₹${walletAmount}`}
          >
            <Ionicons name="wallet-outline" size={16} color="#0F172A" />
            <AppText variant="bodySmallMedium" style={{ marginLeft: 6, color: '#0F172A', fontWeight: '600' }}>
              Wallet <AppText variant="bodySmallMedium" style={{ fontWeight: '700' }}>₹{walletAmount}</AppText>
            </AppText>
          </Pressable>

          {/* My Account Button */}
          <Pressable
            onPress={() => {
              if (!isAuthenticated) router.push('/(auth)/login' as any);
              else router.push('/(tabs)/account' as any);
            }}
            style={[styles.headerPillButton, { marginLeft: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="My Account"
          >
            <Ionicons name="person-outline" size={16} color="#0F172A" />
            <AppText variant="bodySmallMedium" style={{ marginLeft: 6, color: '#0F172A', fontWeight: '600' }}>
              My Account
            </AppText>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* 2. Category Selector Cards: Bus, Train, Hotel, Metro matching ref-1 */}
        <View style={styles.categoryRow}>
          {/* Bus */}
          <Pressable
            onPress={() => setActiveCategory('bus')}
            style={[
              styles.categoryCard,
              activeCategory === 'bus' && styles.categoryCardActive,
            ]}
          >
            <View style={[styles.offerTag, { backgroundColor: '#DCFCE7' }]}>
              <AppText variant="caption" style={[styles.offerTagText, { color: '#15803D' }]}>
                ₹300 off
              </AppText>
            </View>
            <View style={styles.categoryIconWrap}>
              <Ionicons name="bus" size={28} color={activeCategory === 'bus' ? '#D92D20' : '#475569'} />
            </View>
            <AppText
              variant="bodySmallMedium"
              style={[
                styles.categoryLabel,
                activeCategory === 'bus' ? { color: '#D92D20', fontWeight: '700' } : null,
              ]}
            >
              Bus
            </AppText>
          </Pressable>

          {/* Train */}
          <Pressable
            onPress={() => {
              setActiveCategory('train');
              Alert.alert('AiBus Trains', 'Train bookings will be available in the upcoming release.');
            }}
            style={[
              styles.categoryCard,
              activeCategory === 'train' && styles.categoryCardActive,
            ]}
          >
            <View style={[styles.offerTag, { backgroundColor: '#DCFCE7' }]}>
              <AppText variant="caption" style={[styles.offerTagText, { color: '#15803D' }]}>
                ₹300 Off
              </AppText>
            </View>
            <View style={styles.categoryIconWrap}>
              <Ionicons name="train" size={28} color="#475569" />
            </View>
            <AppText variant="bodySmallMedium" style={styles.categoryLabel}>
              Train
            </AppText>
          </Pressable>

          {/* Hotel */}
          <Pressable
            onPress={() => {
              setActiveCategory('hotel');
              Alert.alert('AiBus Hotels', 'Hotel bookings will be available in the upcoming release.');
            }}
            style={[
              styles.categoryCard,
              activeCategory === 'hotel' && styles.categoryCardActive,
            ]}
          >
            <View style={[styles.offerTag, { backgroundColor: '#DCFCE7' }]}>
              <AppText variant="caption" style={[styles.offerTagText, { color: '#15803D' }]}>
                Save 70%
              </AppText>
            </View>
            <View style={styles.categoryIconWrap}>
              <Ionicons name="bed" size={28} color="#475569" />
            </View>
            <AppText variant="bodySmallMedium" style={styles.categoryLabel}>
              Hotel
            </AppText>
          </Pressable>

          {/* Metro */}
          <Pressable
            onPress={() => {
              setActiveCategory('metro');
              Alert.alert('AiBus Metro', 'Metro QR ticketing will be available in the upcoming release.');
            }}
            style={[
              styles.categoryCard,
              activeCategory === 'metro' && styles.categoryCardActive,
            ]}
          >
            <View style={[styles.offerTag, { backgroundColor: '#DCFCE7' }]}>
              <AppText variant="caption" style={[styles.offerTagText, { color: '#15803D' }]}>
                20% Off
              </AppText>
            </View>
            <View style={styles.categoryIconWrap}>
              <MaterialCommunityIcons name="subway-variant" size={28} color="#475569" />
            </View>
            <AppText variant="bodySmallMedium" style={styles.categoryLabel}>
              Metro
            </AppText>
          </Pressable>
        </View>

        {/* 3. Section Title */}
        <View style={styles.sectionHeadingWrap}>
          <AppText variant="heading1" style={styles.mainTitle}>
            Book bus tickets
          </AppText>
        </View>

        {/* 4. Main Search Card matching ref-1 */}
        <View style={styles.searchCardContainer}>
          {/* Top Navy Ribbon */}
          <View style={styles.navyRibbon}>
            <AppText variant="bodySmallMedium" style={styles.navyRibbonText}>
              ZERO convenience fee*
            </AppText>
          </View>

          {/* Card Body with Form Rows */}
          <View style={styles.cardBody}>
            {/* Origin (From) Row */}
            <Pressable
              onPress={() => router.push('/search/from-city' as any)}
              style={styles.fieldRow}
              accessibilityRole="button"
              accessibilityLabel={`Select Origin, currently ${fromCity.name}`}
            >
              <View style={styles.rowIconBox}>
                <Ionicons name="bus-outline" size={22} color="#1E293B" />
              </View>
              <View style={styles.fieldTextWrapper}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  From
                </AppText>
                <AppText variant="heading3" style={{ color: '#0F172A', marginTop: 2 }}>
                  {fromCity.name}
                </AppText>
              </View>
            </Pressable>

            {/* Swap Divider & Button */}
            <View style={styles.swapDividerRow}>
              <View style={styles.dividerLine} />
              <Pressable
                onPress={handleSwap}
                style={styles.swapCircleButton}
                accessibilityRole="button"
                accessibilityLabel="Swap origin and destination cities"
              >
                <Animated.View style={animatedSwapStyle}>
                  <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
                </Animated.View>
              </Pressable>
            </View>

            {/* Destination (To) Row */}
            <Pressable
              onPress={() => router.push('/search/to-city' as any)}
              style={styles.fieldRow}
              accessibilityRole="button"
              accessibilityLabel={`Select Destination, currently ${toCity.name}`}
            >
              <View style={styles.rowIconBox}>
                <Ionicons name="bus-outline" size={22} color="#1E293B" />
              </View>
              <View style={styles.fieldTextWrapper}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  To
                </AppText>
                <AppText variant="heading3" style={{ color: '#0F172A', marginTop: 2 }}>
                  {toCity.name}
                </AppText>
              </View>
            </Pressable>

            <View style={styles.dividerLine} />

            {/* Date of Journey Row */}
            <Pressable
              onPress={() => setDateModalVisible(true)}
              style={styles.fieldRow}
              accessibilityRole="button"
              accessibilityLabel={`Date of Journey ${formattedDate}`}
            >
              <View style={styles.rowIconBox}>
                <Ionicons name="calendar-outline" size={22} color="#1E293B" />
              </View>

              <View style={styles.fieldTextWrapper}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Date of Journey
                </AppText>
                <AppText variant="heading3" style={{ color: '#0F172A', marginTop: 2 }}>
                  {formattedDate}
                </AppText>
              </View>

              {/* Quick Today / Tomorrow Pills matching ref-1 */}
              <View style={styles.quickDatePillsContainer}>
                <Pressable
                  onPress={() => setJourneyDate(todayStr)}
                  style={[
                    styles.quickPill,
                    {
                      backgroundColor: isToday ? '#FEE2E2' : '#F1F5F9',
                      borderColor: isToday ? '#FCA5A5' : 'transparent',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isToday ? '#DC2626' : '#475569',
                      fontWeight: '700',
                    }}
                  >
                    Today
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => setJourneyDate(tomorrowStr)}
                  style={[
                    styles.quickPill,
                    {
                      backgroundColor: isTomorrow ? '#FEE2E2' : '#F1F5F9',
                      borderColor: isTomorrow ? '#FCA5A5' : 'transparent',
                      marginLeft: 8,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: isTomorrow ? '#DC2626' : '#475569',
                      fontWeight: '700',
                    }}
                  >
                    Tomorrow
                  </AppText>
                </Pressable>
              </View>
            </Pressable>

            <View style={styles.dividerLine} />

            {/* Booking for Women Row matching ref-1 */}
            <View style={[styles.fieldRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.rowIconBox}>
                  <Ionicons name="person-circle-outline" size={24} color="#1E293B" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                    Booking for women
                  </AppText>
                  <Pressable onPress={showWomenInfo} hitSlop={8}>
                    <AppText
                      variant="caption"
                      style={{ color: '#0284C7', textDecorationLine: 'underline', marginTop: 2 }}
                    >
                      Know more
                    </AppText>
                  </Pressable>
                </View>
              </View>

              <Switch
                value={isWomenBooking}
                onValueChange={(val) => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setIsWomenBooking(val);
                }}
                trackColor={{ false: '#CBD5E1', true: '#FCA5A5' }}
                thumbColor={isWomenBooking ? '#D92D20' : '#F8FAFC'}
              />
            </View>
          </View>
        </View>

        {/* 5. Search Buses CTA Button matching ref-1 */}
        <Pressable
          onPress={handleSearchBuses}
          style={({ pressed }) => [
            styles.searchBusesButton,
            { opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search buses"
        >
          <Ionicons name="search" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <AppText variant="heading3" style={styles.searchBusesText}>
            Search buses
          </AppText>
        </Pressable>

        {/* 6. Promotional Festival Sale Banner matching ref-1 bottom */}
        <View style={styles.promoBannerCard}>
          <View style={styles.promoContentRow}>
            <View style={styles.promoBadgeIcon}>
              <Ionicons name="sparkles" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="caption" style={{ color: '#B45309', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                TAKING INDIA HOME SALE
              </AppText>
              <AppText variant="bodyLargeBold" style={{ color: '#78350F', marginTop: 2 }}>
                Flat ₹300 OFF on First 3 Bookings
              </AppText>
              <AppText variant="caption" style={{ color: '#92400E', marginTop: 2 }}>
                Valid across all major routes · 10th OCT - 25th OCT
              </AppText>
            </View>
          </View>
        </View>

        {/* 7. Popular Routes Carousel */}
        <View style={{ marginTop: 24 }}>
          <AppSectionHeader
            title="Popular corridors"
            subtitle="Frequently booked routes with maximum daily frequency"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {recentSearches.map((route, idx) => (
              <Pressable
                key={`${route.fromCityId}-${route.toCityId}-${idx}`}
                onPress={() => handleQuickRouteSelect(route)}
                style={({ pressed }) => [
                  styles.routeCard,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flash" size={14} color="#D97706" />
                  <AppText variant="caption" style={{ color: '#475569', marginLeft: 4, fontWeight: '600' }}>
                    Express Route
                  </AppText>
                </View>
                <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700', marginTop: 6 }}>
                  {route.fromCityName} → {route.toCityName}
                </AppText>
                <AppText variant="caption" style={{ color: '#D92D20', marginTop: 4, fontWeight: '600' }}>
                  Starting from ₹449
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Date Selector Modal matching ref-9 */}
      <AppDateSelectorModal
        visible={dateModalVisible}
        selectedDate={journeyDate}
        onSelectDate={setJourneyDate}
        onClose={() => setDateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    marginLeft: 8,
    color: '#D92D20',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 32 - 30) / 4,
    height: 94,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardActive: {
    borderColor: '#D92D20',
    borderWidth: 1.5,
  },
  offerTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  offerTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  categoryIconWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeadingWrap: {
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  searchCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  navyRibbon: {
    backgroundColor: '#0D2149',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navyRibbonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowIconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  swapDividerRow: {
    position: 'relative',
    height: 36,
    justifyContent: 'center',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  swapCircleButton: {
    position: 'absolute',
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  quickDatePillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchBusesButton: {
    backgroundColor: '#D92D20',
    borderRadius: 28,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#D92D20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBusesText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  promoBannerCard: {
    marginTop: 24,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  promoContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginRight: 12,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});
