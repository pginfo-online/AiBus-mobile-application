import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppBadge,
  AppChip,
  AppSkeleton,
  AppEmptyState,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useAuthStore } from '../../stores/authStore';
import { useUserBookingsQuery } from '../../features/booking/useBookingMutations';
import { BookingResponseData } from '../../types/api';

export default function BookingsScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: bookings, isLoading, refetch, isRefetching } = useUserBookingsQuery(isAuthenticated);

  // Tab filter: 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  const [filterTab, setFilterTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (filterTab === 'ALL') return bookings;

    const today = new Date().toISOString().slice(0, 10);

    if (filterTab === 'UPCOMING') {
      return bookings.filter(
        (b) => b.status === 'CONFIRMED' && b.journeyDate >= today
      );
    }
    if (filterTab === 'COMPLETED') {
      return bookings.filter(
        (b) => b.status === 'CONFIRMED' && b.journeyDate < today
      );
    }
    if (filterTab === 'CANCELLED') {
      return bookings.filter((b) => b.status === 'CANCELLED');
    }
    return bookings;
  }, [bookings, filterTab]);

  const renderBookingCard = ({ item }: { item: BookingResponseData }) => {
    const isConfirmed = item.status === 'CONFIRMED';
    const isCancelled = item.status === 'CANCELLED';

    let badgeVariant: 'success' | 'danger' | 'warning' = 'warning';
    if (isConfirmed) badgeVariant = 'success';
    if (isCancelled) badgeVariant = 'danger';

    return (
      <AppCard
        variant="elevated"
        padding="base"
        onPress={() => {
          router.push({
            pathname: '/ticket/[bookingId]' as any,
            params: { bookingId: item.id },
          });
        }}
        style={[styles.bookingCard, shadows.sm]}
      >
        <View style={styles.cardHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.textSecondary }}>
              Booking #{item.bookingNumber}
            </AppText>
            <AppText variant="heading3" style={{ color: colors.text, marginTop: 2 }}>
              {item.fromCityName} → {item.toCityName}
            </AppText>
          </View>
          <AppBadge label={item.status} variant={badgeVariant} />
        </View>

        <View style={styles.cardInfoRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
              Date: <AppText variant="bodySmallMedium" style={{ color: colors.text }}>{item.journeyDate}</AppText>
            </AppText>
            <AppText variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
              Operator: <AppText variant="bodySmallMedium" style={{ color: colors.text }}>{item.operatorName}</AppText>
            </AppText>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              Paid
            </AppText>
            <AppText variant="priceMedium" style={{ color: colors.primary }}>
              ₹{item.totalFare}
            </AppText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <AppText variant="caption" style={{ color: colors.textSecondary }}>
            Seats: {item.seats?.map((s) => s.seatNo).join(', ') || 'N/A'}
          </AppText>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700', marginRight: 4 }}>
              View Ticket
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="heading2" style={{ color: colors.text }}>
          {t('tab.bookings')}
        </AppText>
      </View>

      {!isAuthenticated ? (
        <View style={styles.authPromptContainer}>
          <AppEmptyState
            icon={<Ionicons name="lock-closed-outline" size={44} color={colors.primary} />}
            title="Log In to View Bookings"
            description="Access your confirmed tickets, journey updates, and past trip history."
            actionTitle={t('account.login')}
            onAction={() => router.push('/(auth)/login' as any)}
          />
        </View>
      ) : (
        <>
          {/* 2. Filter Tabs */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { key: 'ALL', label: 'All Bookings' },
                { key: 'UPCOMING', label: t('bookings.upcoming') },
                { key: 'COMPLETED', label: t('bookings.completed') },
                { key: 'CANCELLED', label: t('bookings.cancelled') },
              ]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <AppChip
                  label={item.label}
                  selected={filterTab === item.key}
                  onPress={() => setFilterTab(item.key as any)}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>

          {/* 3. Bookings List */}
          {isLoading ? (
            <View style={{ padding: spacing.base }}>
              {[1, 2, 3].map((k) => (
                <View key={k} style={{ marginBottom: spacing.md }}>
                  <AppSkeleton height={130} borderRadius={16} />
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={filteredBookings}
              keyExtractor={(item) => item.id}
              renderItem={renderBookingCard}
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
                  icon={<Ionicons name="receipt-outline" size={44} color={colors.textMuted} />}
                  title={t('bookings.no_bookings')}
                  description="When you book bus tickets, your reservations will appear here."
                  actionTitle={t('bookings.book_now')}
                  onAction={() => router.navigate('/(tabs)/home' as any)}
                />
              )}
            />
          )}
        </>
      )}
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
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  bookingCard: {
    marginBottom: 12,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  authPromptContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
