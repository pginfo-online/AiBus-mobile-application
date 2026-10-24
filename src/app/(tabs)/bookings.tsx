import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import { AppText, AppEmptyState } from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useAuthStore } from '../../stores/authStore';
import { useUserBookingsQuery } from '../../features/booking/useBookingMutations';
import { BookingResponseData } from '../../types/api';
import { BookingCardSkeleton } from '../../features/booking/BookingCardSkeleton';
import { WhereToNextEmptyState } from '../../features/booking/WhereToNextEmptyState';

// 3 Main Segment Filters strictly matching ref-2.png
type BookingTabFilter = 'UPCOMING' | 'PAST_TRIPS' | 'CANCELLED';

export default function BookingsScreen() {
  const router = useRouter();
  const { colors, spacing, shadows } = useAppTheme();
  const { t } = useTranslation();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: bookings, isLoading, refetch, isRefetching } = useUserBookingsQuery(isAuthenticated);

  const [activeTab, setActiveTab] = useState<BookingTabFilter>('UPCOMING');
  const isRefreshingRef = useRef<boolean>(false);

  // Split bookings into Upcoming, Past Trips, and Cancelled
  const { upcomingBookings, pastBookings, cancelledBookings } = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return { upcomingBookings: [], pastBookings: [], cancelledBookings: [] };
    }

    const today = new Date().toISOString().slice(0, 10);
    const upcoming: BookingResponseData[] = [];
    const past: BookingResponseData[] = [];
    const cancelled: BookingResponseData[] = [];

    bookings.forEach((b) => {
      if (b.status === 'CANCELLED') {
        cancelled.push(b);
      } else if (
        (b.status === 'CONFIRMED' || b.status === 'HELD' || b.status === 'PAYMENT_PENDING') &&
        b.journeyDate >= today
      ) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    });

    return {
      upcomingBookings: upcoming,
      pastBookings: past,
      cancelledBookings: cancelled,
    };
  }, [bookings]);

  // Guarded pull-to-refresh to prevent infinite API calls or duplicate network storms
  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current || isRefetching || isLoading) return;
    isRefreshingRef.current = true;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback
    }

    try {
      await refetch();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refetch, isRefetching, isLoading]);

  const handleTabPress = (tab: BookingTabFilter) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    setActiveTab(tab);
  };

  const formatCardDateTime = (journeyDate?: string, pickupTime?: string) => {
    if (!journeyDate) return '';
    try {
      const d = new Date(journeyDate);
      if (isNaN(d.getTime())) return `${journeyDate}${pickupTime ? `, ${pickupTime}` : ''}`;
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}${pickupTime ? `, ${pickupTime}` : ''}`;
    } catch {
      return `${journeyDate}${pickupTime ? `, ${pickupTime}` : ''}`;
    }
  };

  const navigateToTicket = (bookingId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    router.push({
      pathname: '/ticket/[bookingId]' as any,
      params: { bookingId },
    });
  };

  // Render Upcoming Card
  const renderUpcomingCard = (item: BookingResponseData) => {
    const formattedDate = formatCardDateTime(item.journeyDate, item.pickupTime);
    const seats = item.seats?.map((s) => s.seatNo).join(', ') || '1 Seat';

    return (
      <Pressable
        key={item.id}
        onPress={() => navigateToTicket(item.id)}
        style={({ pressed }) => [
          styles.bookingCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
            <View style={[styles.pulseDot, { backgroundColor: '#16A34A' }]} />
            <AppText variant="caption" style={{ color: '#15803D', fontWeight: '800' }}>
              CONFIRMED
            </AppText>
          </View>
          <AppText variant="caption" style={{ color: colors.textSecondary }}>
            Seat(s): <AppText variant="bodySmall" style={{ color: colors.text, fontWeight: '700' }}>{seats}</AppText>
          </AppText>
        </View>

        <AppText variant="heading2" style={{ color: colors.text, marginTop: 10, fontSize: 18, fontWeight: '800' }}>
          {item.fromCityName} <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>→</AppText> {item.toCityName}
        </AppText>

        <View style={styles.dateTimeRow}>
          <Ionicons name="time-outline" size={16} color="#E65100" style={{ marginRight: 6 }} />
          <AppText variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '600' }}>
            {formattedDate}
          </AppText>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {item.operatorName} • {item.busType}
          </AppText>
          <View style={styles.viewTicketLink}>
            <AppText variant="caption" style={{ color: '#E65100', fontWeight: '700', marginRight: 4 }}>
              View Ticket
            </AppText>
            <Ionicons name="arrow-forward" size={14} color="#E65100" />
          </View>
        </View>
      </Pressable>
    );
  };

  // Render Past Trip Card
  const renderPastTripCard = (item: BookingResponseData) => {
    const formattedDate = formatCardDateTime(item.journeyDate, item.pickupTime);
    const passengerCount = item.passengers?.length || item.seats?.length || 1;

    return (
      <Pressable
        key={item.id}
        onPress={() => navigateToTicket(item.id)}
        style={({ pressed }) => [
          styles.bookingCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="checkmark-done" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
              COMPLETED
            </AppText>
          </View>
          <View style={styles.passengerCountBadge}>
            <Ionicons name="person" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
              {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}
            </AppText>
          </View>
        </View>

        <AppText variant="heading2" style={{ color: colors.text, marginTop: 10, fontSize: 18, fontWeight: '800' }}>
          {item.fromCityName} <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>→</AppText> {item.toCityName}
        </AppText>

        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
          <AppText variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '500' }}>
            {formattedDate}
          </AppText>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {item.operatorName}
          </AppText>
          <View style={styles.viewTicketLink}>
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700', marginRight: 4 }}>
              Details
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  // Render Cancelled Card
  const renderCancelledCard = (item: BookingResponseData) => {
    const formattedDate = formatCardDateTime(item.journeyDate, item.pickupTime);

    return (
      <Pressable
        key={item.id}
        onPress={() => navigateToTicket(item.id)}
        style={({ pressed }) => [
          styles.bookingCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
            <AppText variant="caption" style={{ color: '#DC2626', fontWeight: '800' }}>
              CANCELLED
            </AppText>
          </View>
          <AppText variant="caption" style={{ color: '#16A34A', fontWeight: '600' }}>
            Refund Credited
          </AppText>
        </View>

        <AppText variant="heading2" style={{ color: colors.text, marginTop: 10, fontSize: 18, fontWeight: '800' }}>
          {item.fromCityName} <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>→</AppText> {item.toCityName}
        </AppText>

        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
          <AppText variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '500' }}>
            {formattedDate}
          </AppText>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {item.operatorName}
          </AppText>
          <View style={styles.viewTicketLink}>
            <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '700', marginRight: 4 }}>
              View Cancellation
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar strictly matching ref-1.png: "My bookings" with top-right refresh icon */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="heading1" style={styles.headerTitle}>
          My bookings
        </AppText>

        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => [styles.refreshIconBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <Ionicons name="reload" size={22} color={colors.text} />
        </Pressable>
      </View>

      {!isAuthenticated ? (
        <View style={styles.authContainer}>
          <AppEmptyState
            icon={<Ionicons name="lock-closed-outline" size={48} color={colors.primary} />}
            title="Log In to View Bookings"
            description="Access your confirmed tickets, journey updates, and past trip history."
            actionTitle={t('account.login')}
            onAction={() => router.push('/(auth)/login' as any)}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* 2. Top Capsule Tab Selector strictly matching ref-2.png: [ Upcoming ] Past Trips Cancelled */}
          <View style={styles.tabCapsuleContainer}>
            <View style={styles.capsuleWrapper}>
              {/* Tab 1: Upcoming */}
              <Pressable
                onPress={() => handleTabPress('UPCOMING')}
                style={[
                  styles.capsuleTab,
                  activeTab === 'UPCOMING' && styles.activeCapsuleTab,
                ]}
              >
                <AppText
                  style={[
                    styles.capsuleTabText,
                    activeTab === 'UPCOMING' ? styles.activeCapsuleTabText : styles.inactiveCapsuleTabText,
                  ]}
                >
                  Upcoming
                </AppText>
              </Pressable>

              {/* Tab 2: Past Trips */}
              <Pressable
                onPress={() => handleTabPress('PAST_TRIPS')}
                style={[
                  styles.capsuleTab,
                  activeTab === 'PAST_TRIPS' && styles.activeCapsuleTab,
                ]}
              >
                <AppText
                  style={[
                    styles.capsuleTabText,
                    activeTab === 'PAST_TRIPS' ? styles.activeCapsuleTabText : styles.inactiveCapsuleTabText,
                  ]}
                >
                  Past Trips
                </AppText>
              </Pressable>

              {/* Tab 3: Cancelled */}
              <Pressable
                onPress={() => handleTabPress('CANCELLED')}
                style={[
                  styles.capsuleTab,
                  activeTab === 'CANCELLED' && styles.activeCapsuleTab,
                ]}
              >
                <AppText
                  style={[
                    styles.capsuleTabText,
                    activeTab === 'CANCELLED' ? styles.activeCapsuleTabText : styles.inactiveCapsuleTabText,
                  ]}
                >
                  Cancelled
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* 3. Main Content with RefreshControl & Pixel-Accurate Skeletons */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor="#E65100"
                colors={['#E65100']}
              />
            }
          >
            {isLoading && !bookings ? (
              /* Production Skeleton Loader strictly matching ref-1.png */
              <BookingCardSkeleton count={2} />
            ) : (
              <>
                {/* UPCOMING TAB */}
                {activeTab === 'UPCOMING' && (
                  upcomingBookings.length > 0 ? (
                    <View style={styles.cardsList}>
                      {upcomingBookings.map(renderUpcomingCard)}
                    </View>
                  ) : (
                    /* Empty State strictly matching ref-2.png */
                    <WhereToNextEmptyState onPlanTrip={() => router.navigate('/(tabs)/home' as any)} />
                  )
                )}

                {/* PAST TRIPS TAB */}
                {activeTab === 'PAST_TRIPS' && (
                  pastBookings.length > 0 ? (
                    <View style={styles.cardsList}>
                      {pastBookings.map(renderPastTripCard)}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="time-outline" size={56} color="#CBD5E1" />
                      <AppText variant="heading3" style={{ color: colors.text, marginTop: 14, fontWeight: '700' }}>
                        No past trips
                      </AppText>
                      <AppText variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 }}>
                        Completed journeys and travels will appear here once you travel.
                      </AppText>
                      <Pressable
                        onPress={() => router.navigate('/(tabs)/home' as any)}
                        style={styles.browseTripsBtn}
                      >
                        <AppText style={styles.browseTripsBtnText}>
                          Book a trip
                        </AppText>
                      </Pressable>
                    </View>
                  )
                )}

                {/* CANCELLED TAB */}
                {activeTab === 'CANCELLED' && (
                  cancelledBookings.length > 0 ? (
                    <View style={styles.cardsList}>
                      {cancelledBookings.map(renderCancelledCard)}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="checkmark-circle-outline" size={56} color="#CBD5E1" />
                      <AppText variant="heading3" style={{ color: colors.text, marginTop: 14, fontWeight: '700' }}>
                        No cancelled trips
                      </AppText>
                      <AppText variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 }}>
                        You have not cancelled any bookings. All your active trips are safe!
                      </AppText>
                    </View>
                  )
                )}
              </>
            )}
          </ScrollView>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshIconBtn: {
    padding: 6,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tabCapsuleContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  capsuleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Capsule background strictly matching ref-2.png
    borderRadius: 30,
    padding: 4,
    justifyContent: 'space-between',
  },
  capsuleTab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCapsuleTab: {
    backgroundColor: '#1E293B', // Dark Navy / Slate pill strictly matching ref-2.png
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  capsuleTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeCapsuleTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inactiveCapsuleTabText: {
    color: '#475569',
  },
  scrollContent: {
    paddingBottom: 48,
    flexGrow: 1,
  },
  cardsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bookingCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  passengerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewTicketLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseTripsBtn: {
    backgroundColor: '#E65100',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
  },
  browseTripsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
