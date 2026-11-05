import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppSkeleton,
  AppEmptyState,
  AppErrorState,
  AppDateSelectorModal,
  BusFiltersModal,
  ComprehensiveFilterState,
  DEFAULT_FILTER_STATE,
} from '../../design-system';
import { useBookingStore } from '../../stores/bookingStore';
import { useAuthStore } from '../../stores/authStore';
import { useBusesQuery } from '../../features/buses/useBusesQuery';
import { BusSearchResultItem } from '../../types/api';

function durationMinutes(departure: string, arrival: string) {
  const [departureHour, departureMinute] = departure.split(':').map(Number);
  const [arrivalHour, arrivalMinute] = arrival.split(':').map(Number);
  return ((arrivalHour - departureHour) * 60 + arrivalMinute - departureMinute + 1440) % 1440;
}

export default function BusesScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const {
    fromCity,
    toCity,
    journeyDate,
    setJourneyDate,
    setSelectedBus,
  } = useBookingStore();

  // Modals state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Comprehensive filter state
  const [filters, setFilters] = useState<ComprehensiveFilterState>(DEFAULT_FILTER_STATE);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useBusesQuery({
    fromCityId: fromCity.providerCityId,
    toCityId: toCity.providerCityId,
    journeyDate,
  });

  const rawBuses = data?.results || [];

  // Formatted date pill header e.g. "18 Oct" / "Sun" matching ref-4
  const datePill = useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const day = d.getDate();
      const month = d.toLocaleDateString('en-IN', { month: 'short' });
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
      return { dayMonth: `${day} ${month}`, weekday };
    } catch {
      return { dayMonth: journeyDate, weekday: '' };
    }
  }, [journeyDate]);

  // Apply filters & sorting in memory across results
  const filteredBuses = useMemo(() => {
    let list = [...rawBuses];

    // Quick chips
    // Modal filters: Bus type
    if (filters.busTypes.length > 0) {
      list = list.filter((b) => {
        return filters.busTypes.some((bt) => {
          if (bt === 'seater') return !b.IsSleeper || b.BusTypeName.toLowerCase().includes('seater');
          if (bt === 'sleeper') return b.IsSleeper;
          if (bt === 'ac') return b.IsAC;
          if (bt === 'nonac') return !b.IsAC;
          if (bt === 'volvo') return b.BusTypeName.toLowerCase().includes('volvo') || b.CompanyName.toLowerCase().includes('volvo');
          return true;
        });
      });
    }

    // Modal filters: Departure times
    if (filters.departureTimeWindows.length > 0) {
      list = list.filter((b) => {
        const hour = parseInt(b.DepartureTime.split(':')[0], 10) || 0;
        return filters.departureTimeWindows.some((w) => {
          if (w === 'before_6am') return hour < 6;
          if (w === '6am_12pm') return hour >= 6 && hour < 12;
          if (w === '12pm_6pm') return hour >= 12 && hour < 18;
          if (w === 'after_6pm') return hour >= 18;
          return true;
        });
      });
    }

    // Modal filters: Operators
    if (filters.operators.length > 0) {
      list = list.filter((b) => filters.operators.includes(b.CompanyName));
    }

    // Modal filters: Boarding points
    if (filters.boardingPoints.length > 0) {
      list = list.filter((b) => b.BoardingPoints?.some((bp) => filters.boardingPoints.includes(bp.PickupName)));
    }

    // Modal filters: Dropping points
    if (filters.droppingPoints.length > 0) {
      list = list.filter((b) => b.DroppingPoints?.some((dp) => filters.droppingPoints.includes(dp.DropoffName)));
    }

    // Sorting
    switch (filters.sortBy) {
      case 'fare_asc':
        list.sort((a, b) => a.TotalFare - b.TotalFare);
        break;
      case 'fare_desc':
        list.sort((a, b) => b.TotalFare - a.TotalFare);
        break;
      case 'departure_asc':
        list.sort((a, b) => a.DepartureTime.localeCompare(b.DepartureTime));
        break;
      case 'departure_desc':
        list.sort((a, b) => b.DepartureTime.localeCompare(a.DepartureTime));
        break;
      case 'duration_asc':
        list.sort((a, b) => durationMinutes(a.DepartureTime, a.ArrivalTime) - durationMinutes(b.DepartureTime, b.ArrivalTime));
        break;
    }

    return list;
  }, [rawBuses, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.busTypes.length > 0) count += filters.busTypes.length;
    if (filters.departureTimeWindows.length > 0) count += filters.departureTimeWindows.length;
    if (filters.operators.length > 0) count += filters.operators.length;
    if (filters.boardingPoints.length > 0) count += filters.boardingPoints.length;
    if (filters.droppingPoints.length > 0) count += filters.droppingPoints.length;
    if (filters.sortBy !== 'departure_asc') count += 1;
    return count;
  }, [filters]);

  const handleSelectBus = useCallback(
    (bus: BusSearchResultItem) => {
      try {
        Haptics.selectionAsync();
      } catch {}
      setSelectedBus(bus);
      router.push('/booking/seat-map' as any);
    },
    [router, setSelectedBus]
  );

  const calculateDuration = (dep: string, arr: string): string => {
    try {
      const [depH, depM] = dep.split(':').map(Number);
      const [arrH, arrM] = arr.split(':').map(Number);
      let diffMins = arrH * 60 + arrM - (depH * 60 + depM);
      if (diffMins < 0) diffMins += 24 * 60;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins > 0 ? `${mins}m` : '00m'}`;
    } catch {
      return '6h 20m';
    }
  };

  const walletAmount = user?.walletBalance ? Number(user.walletBalance).toFixed(0) : '0';

  const renderBusItem = useCallback(
    ({ item }: { item: BusSearchResultItem }) => {
      const duration = calculateDuration(item.DepartureTime, item.ArrivalTime);
      return (
        <AppCard
          variant="elevated"
          padding="none"
          onPress={() => handleSelectBus(item)}
          style={[styles.busCard, shadows.sm]}
        >
          <View style={styles.cardInnerPadding}>
            {/* Time & Price Row matching ref-4 */}
            <View style={styles.timePriceRow}>
              <View style={styles.timeCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="heading2" style={styles.timeText}>
                    {item.DepartureTime.slice(0, 5)}
                  </AppText>
                  <AppText variant="bodyLarge" style={{ marginHorizontal: 8, color: '#94A3B8' }}>
                    —
                  </AppText>
                  <AppText variant="heading2" style={styles.timeText}>
                    {item.ArrivalTime.slice(0, 5)}
                  </AppText>
                </View>
                <AppText variant="caption" style={styles.durationSubtext}>
                  {duration} · {item.AvailableSeats} seats
                </AppText>
              </View>

              <View style={styles.priceCol}>
                <AppText variant="heading2" style={styles.priceText}>
                  ₹{item.TotalFare}
                </AppText>
                <AppText variant="caption" style={styles.onwardsText}>
                  Onwards
                </AppText>
              </View>
            </View>

            {/* Operator & Rating Row matching ref-4 */}
            <View style={styles.operatorRatingRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppText variant="bodyLargeBold" numberOfLines={1} style={styles.operatorText}>
                  {item.CompanyName}
                </AppText>
                <AppText variant="caption" numberOfLines={1} style={styles.busTypeText}>
                  {item.BusTypeName}
                </AppText>
              </View>

            </View>
          </View>
        </AppCard>
      );
    },
    [handleSelectBus, shadows.sm]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]} edges={['top']}>
      {/* 1. Header Bar matching ref-4 */}
      <View style={[styles.headerBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <AppText variant="bodyLargeBold" style={styles.headerRouteTitle}>
            {fromCity.name} <Ionicons name="arrow-forward" size={14} color="#0F172A" /> {toCity.name}
          </AppText>
          <AppText variant="caption" style={{ color: '#64748B', marginTop: 1 }}>
            {filteredBuses.length} Buses
          </AppText>
        </View>

        {/* Date Button Pill matching ref-4: "18 Oct \n Sun" */}
        <Pressable
          onPress={() => setDateModalVisible(true)}
          style={styles.dateHeaderPill}
          accessibilityRole="button"
          accessibilityLabel={`Change date, current ${datePill.dayMonth}`}
        >
          <AppText variant="bodySmallMedium" style={{ fontWeight: '700', color: '#0F172A' }}>
            {datePill.dayMonth}
          </AppText>
          <AppText variant="caption" style={{ color: '#64748B', marginTop: 1 }}>
            {datePill.weekday}
          </AppText>
        </Pressable>
      </View>

      {/* 2. Horizontal Scroll Filter Chips Bar matching ref-4 */}
      <View style={[styles.filterBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Main "Sort & Filter" button with icon */}
          <Pressable
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.filterPill,
              activeFiltersCount > 0 && styles.filterPillActive,
            ]}
          >
            <Ionicons name="options-outline" size={16} color={activeFiltersCount > 0 ? '#D92D20' : '#0F172A'} style={{ marginRight: 6 }} />
            <AppText
              variant="bodySmallMedium"
              style={[
                styles.filterPillText,
                activeFiltersCount > 0 ? { color: '#D92D20', fontWeight: '700' } : null,
              ]}
            >
              Sort & Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </AppText>
          </Pressable>

        </ScrollView>
      </View>

      {/* 3. Wallet Balance Banner matching ref-4 */}
      <View style={styles.walletBannerWrapper}>
        <View style={styles.walletBannerCard}>
          <Ionicons name="wallet" size={18} color="#15803D" style={{ marginRight: 8 }} />
          <AppText variant="bodySmallMedium" style={{ color: '#14532D', fontWeight: '600' }}>
            <AppText variant="bodySmallMedium" style={{ fontWeight: '800', color: '#15803D' }}>₹{walletAmount} </AppText>
            in your wallet
          </AppText>
        </View>
      </View>

      {/* 4. Results List with Skeletons */}
      {isLoading ? (
        <View style={{ padding: 16 }}>
          {[1, 2, 3, 4].map((k) => (
            <View key={k} style={[styles.busCard, { marginBottom: 14, padding: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <AppSkeleton width={180} height={22} borderRadius={6} />
                <AppSkeleton width={70} height={22} borderRadius={6} />
              </View>
              <AppSkeleton width={130} height={16} borderRadius={4} style={{ marginBottom: 14 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppSkeleton width={140} height={20} borderRadius={6} />
                <AppSkeleton width={50} height={20} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      ) : isError ? (
        <AppErrorState
          error={error}
          title="Could not load buses"
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={filteredBuses}
          keyExtractor={(item) => String(item.RouteBusId || item.TripId)}
          renderItem={renderBusItem}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#D92D20"
              colors={['#D92D20']}
            />
          }
          ListEmptyComponent={() => (
            <AppEmptyState
              icon={<Ionicons name="bus-outline" size={48} color="#94A3B8 Tanner" />}
              title="No buses available for this filter"
              description="Try adjusting your filter options or selecting another travel date."
              actionTitle="Reset Filters"
              onAction={() => {
                setFilters(DEFAULT_FILTER_STATE);
              }}
            />
          )}
        />
      )}

      {/* 5. Floating AI Assistant Pill "✦ Ask Ray" matching ref-4 */}
      <Pressable
        onPress={() => {
          try {
            Haptics.selectionAsync();
          } catch {}
          router.push('/(tabs)/help' as any);
        }}
        style={styles.floatingRayButton}
        accessibilityRole="button"
        accessibilityLabel="Ask Ray AI Assistant"
      >
        <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <AppText variant="bodySmallMedium" style={{ color: '#FFFFFF', fontWeight: '700' }}>
          Ask ais
        </AppText>
      </Pressable>

      {/* Date Selector Modal */}
      <AppDateSelectorModal
        visible={dateModalVisible}
        selectedDate={journeyDate}
        onSelectDate={setJourneyDate}
        onClose={() => setDateModalVisible(false)}
      />

      {/* Comprehensive Filter Modal matching ref-5 */}
      <BusFiltersModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        buses={rawBuses}
        currentFilters={filters}
        onApplyFilters={setFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 2,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerRouteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateHeaderPill: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    borderColor: '#D92D20',
    backgroundColor: '#FEF2F2',
  },
  filterPillText: {
    color: '#0F172A',
    fontSize: 13,
  },
  walletBannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  walletBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  listContent: {
    paddingTop: 6,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInnerPadding: {
    padding: 16,
  },
  primoTopBadgeRow: {
    marginBottom: 10,
  },
  primoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primoText: {
    fontSize: 12,
  },
  timePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeCol: {
    flex: 1,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  durationSubtext: {
    color: '#64748B',
    marginTop: 4,
    fontSize: 12,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  onwardsText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  operatorRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  operatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  busTypeText: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  reviewCountText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  floatingRayButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A855F7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
