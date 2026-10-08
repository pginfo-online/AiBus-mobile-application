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
  AppBadge,
  AppChip,
  AppSkeleton,
  AppEmptyState,
  AppErrorState,
  AppDivider,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore } from '../../stores/bookingStore';
import { useBusesQuery, BusSearchFilterOptions } from '../../features/buses/useBusesQuery';
import { BusSearchResultItem } from '../../types/api';

export default function BusesScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t, language } = useTranslation();

  const {
    fromCity,
    toCity,
    journeyDate,
    setJourneyDate,
    setSelectedBus,
  } = useBookingStore();

  // Filter state
  const [isACFilter, setIsACFilter] = useState<boolean | undefined>(undefined);
  const [isSleeperFilter, setIsSleeperFilter] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<BusSearchFilterOptions['sortBy']>('departure_asc');

  const filterParams: BusSearchFilterOptions = useMemo(() => {
    return {
      fromCityId: fromCity.providerCityId,
      toCityId: toCity.providerCityId,
      journeyDate,
      isAC: isACFilter,
      isSleeper: isSleeperFilter,
      sortBy,
    };
  }, [fromCity.providerCityId, toCity.providerCityId, journeyDate, isACFilter, isSleeperFilter, sortBy]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useBusesQuery(filterParams);

  // Date formatted display
  const formattedDate = useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(
        language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
        { weekday: 'short', day: 'numeric', month: 'short' }
      );
    } catch {
      return journeyDate;
    }
  }, [journeyDate, language]);

  const handleSelectBus = useCallback(
    (bus: BusSearchResultItem) => {
      try {
        Haptics.selectionAsync();
      } catch {
        // Safe fallback
      }
      setSelectedBus(bus);
      router.push('/booking/seat-map' as any);
    },
    [router, setSelectedBus]
  );

  const calculateDuration = (dep: string, arr: string): string => {
    try {
      // Parse "HH:MM" format
      const [depH, depM] = dep.split(':').map(Number);
      const [arrH, arrM] = arr.split(':').map(Number);
      let diffMins = arrH * 60 + arrM - (depH * 60 + depM);
      if (diffMins < 0) diffMins += 24 * 60; // Next day arrival
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    } catch {
      return 'Direct';
    }
  };

  const renderBusItem = useCallback(
    ({ item }: { item: BusSearchResultItem }) => {
      const duration = calculateDuration(item.DepartureTime, item.ArrivalTime);
      const isFastFilling = item.AvailableSeats <= 5 && item.AvailableSeats > 0;

      return (
        <AppCard
          variant="elevated"
          padding="base"
          onPress={() => handleSelectBus(item)}
          style={[styles.busCard, shadows.sm]}
        >
          {/* Top Row: Operator & Price */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppText variant="bodyLargeBold" numberOfLines={1} style={{ color: colors.text }}>
                {item.CompanyName}
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={{ color: colors.textSecondary, marginTop: 2 }}>
                {item.BusTypeName}
              </AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {t('buses.starting_from')}
              </AppText>
              <AppText variant="priceLarge" style={{ color: colors.primary }}>
                ₹{item.TotalFare}
              </AppText>
            </View>
          </View>

          {/* Middle Row: Departure - Duration - Arrival */}
          <View style={[styles.timelineRow, { marginVertical: spacing.md }]}>
            <View style={{ alignItems: 'flex-start' }}>
              <AppText variant="heading2" style={{ color: colors.text }}>
                {item.DepartureTime}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                {fromCity.name}
              </AppText>
            </View>

            <View style={styles.durationWrapper}>
              <AppText variant="caption" style={{ color: colors.textMuted, marginBottom: 2 }}>
                {duration}
              </AppText>
              <View style={[styles.durationLine, { backgroundColor: colors.border }]}>
                <Ionicons name="bus-outline" size={14} color={colors.textSecondary} />
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="heading2" style={{ color: colors.text }}>
                {item.ArrivalTime}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                {toCity.name}
              </AppText>
            </View>
          </View>

          <AppDivider spacingMargin="xs" />

          {/* Bottom Row: Seat Availability Badge & Attributes */}
          <View style={styles.cardFooter}>
            <View style={styles.badgesRow}>
              {item.IsAC && <AppBadge label="AC" variant="info" size="sm" style={{ marginRight: 6 }} />}
              {item.IsSleeper ? (
                <AppBadge label="Sleeper" variant="primary" size="sm" style={{ marginRight: 6 }} />
              ) : (
                <AppBadge label="Seater" variant="neutral" size="sm" style={{ marginRight: 6 }} />
              )}
            </View>

            <View style={styles.seatsLeftPill}>
              <AppText
                variant="caption"
                style={{
                  color: isFastFilling ? colors.danger : colors.success,
                  fontWeight: '700',
                }}
              >
                {t('buses.seats_left', { count: item.AvailableSeats })}
              </AppText>
            </View>
          </View>
        </AppCard>
      );
    },
    [colors, fromCity.name, handleSelectBus, shadows.sm, spacing.md, t, toCity.name]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
            {fromCity.name} → {toCity.name}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 1 }}>
            {formattedDate} • {data?.total ?? 0} Buses
          </AppText>
        </View>
      </View>

      {/* 2. Sticky Horizontal Filter Chips */}
      <View
        style={[
          styles.filterBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* AC Filter */}
          <AppChip
            label="AC"
            selected={isACFilter === true}
            onPress={() => setIsACFilter((prev) => (prev === true ? undefined : true))}
          />

          {/* Non-AC Filter */}
          <AppChip
            label="Non-AC"
            selected={isACFilter === false}
            onPress={() => setIsACFilter((prev) => (prev === false ? undefined : false))}
          />

          {/* Sleeper Filter */}
          <AppChip
            label="Sleeper"
            selected={isSleeperFilter === true}
            onPress={() => setIsSleeperFilter((prev) => (prev === true ? undefined : true))}
          />

          {/* Seater Filter */}
          <AppChip
            label="Seater"
            selected={isSleeperFilter === false}
            onPress={() => setIsSleeperFilter((prev) => (prev === false ? undefined : false))}
          />

          {/* Sort By Price */}
          <AppChip
            label="Cheapest"
            selected={sortBy === 'fare_asc'}
            onPress={() => setSortBy((prev) => (prev === 'fare_asc' ? 'departure_asc' : 'fare_asc'))}
            icon={<Ionicons name="pricetag-outline" size={14} color={sortBy === 'fare_asc' ? colors.primary : colors.text} />}
          />

          {/* Sort By Departure */}
          <AppChip
            label="Departure Time"
            selected={sortBy === 'departure_asc'}
            onPress={() => setSortBy('departure_asc')}
            icon={<Ionicons name="time-outline" size={14} color={sortBy === 'departure_asc' ? colors.primary : colors.text} />}
          />
        </ScrollView>
      </View>

      {/* 3. Results List */}
      {isLoading ? (
        <View style={{ padding: spacing.base }}>
          {[1, 2, 3, 4].map((key) => (
            <View key={key} style={{ marginBottom: spacing.md }}>
              <AppSkeleton height={140} borderRadius={16} />
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
          data={data?.results || []}
          keyExtractor={(item) => String(item.RouteBusId || item.TripId)}
          renderItem={renderBusItem}
          contentContainerStyle={[styles.listContent, { padding: spacing.base }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={() => (
            <AppEmptyState
              icon={<Ionicons name="bus-outline" size={48} color={colors.textMuted} />}
              title={t('buses.no_buses')}
              description={t('buses.try_different')}
              actionTitle="Clear Filters"
              onAction={() => {
                setIsACFilter(undefined);
                setIsSleeperFilter(undefined);
                setSortBy('departure_asc');
              }}
            />
          )}
        />
      )}
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
    marginRight: 14,
    padding: 4,
  },
  headerTitleBox: {
    flex: 1,
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
  busCard: {
    marginBottom: 14,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationWrapper: {
    alignItems: 'center',
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsLeftPill: {
    alignItems: 'flex-end',
  },
});
