import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppErrorState,
  BusDetailsBottomSheet,
} from '../../design-system';
import { useBookingStore, SelectedSeatItem } from '../../stores/bookingStore';
import { useSeatChartQuery } from '../../features/seats/useSeatChartQuery';
import { SeatLayoutItem } from '../../types/api';

// Memoized individual seat cell component matching ref-6, ref-7, ref-8, ref-12
interface SeatCellProps {
  item: SeatLayoutItem;
  isSelected: boolean;
  onToggle: (seat: SelectedSeatItem) => void;
  colors: any;
  radii: any;
}

const SeatCell = React.memo(function SeatCell({
  item,
  isSelected,
  onToggle,
  colors,
}: SeatCellProps) {
  // Seat statuses: 1 = Available, 0 = Blocked, 2 = Male, 3 = Female, -2 = Booked by M, -3 = Booked by F
  const isAvailable = item.seat_status === 1 || item.seat_status === 2 || item.seat_status === 3;
  const isBooked = item.seat_status === 0 || item.seat_status === -2 || item.seat_status === -3;
  const isFemale = item.seat_status === 3 || item.seat_status === -3;
  const isMale = item.seat_status === 2 || item.seat_status === -2;
  const isSleeper = item.seat_type === 2;

  let borderColor = '#16A34A'; // Default available is green outline as shown in ref-6
  let backgroundColor = '#FFFFFF';
  let textColor = '#0F172A';

  if (isSelected) {
    backgroundColor = '#16A34A'; // Solid vibrant green fill matching ref-12
    borderColor = '#16A34A';
    textColor = '#FFFFFF';
  } else if (isBooked) {
    backgroundColor = '#F9FAFB';
    borderColor = '#E5E7EB';
    textColor = '#9CA3AF';
  } else if (isFemale) {
    backgroundColor = '#FFFFFF';
    borderColor = '#EC4899';
    textColor = '#EC4899';
  } else if (isMale) {
    backgroundColor = '#FFFFFF';
    borderColor = '#2563EB';
    textColor = '#2563EB';
  }

  const handlePress = () => {
    if (!isAvailable) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      return;
    }

    try {
      Haptics.selectionAsync();
    } catch {}

    onToggle({
      seqNo: item.seq_no,
      seatNo: item.seat_no,
      seatType: item.seat_type,
      deck: item.deck,
      fare: item.total_fare,
      baseFare: item.base_fare,
      tax: item.service_tax,
    });
  };

  return (
    <View style={styles.seatCellContainer}>
      <Pressable
        onPress={handlePress}
        disabled={isBooked}
        style={({ pressed }) => [
          isSleeper ? styles.sleeperShape : styles.seaterShape,
          {
            backgroundColor,
            borderColor,
            opacity: pressed && isAvailable ? 0.75 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${item.seat_no}, ${isSleeper ? 'Sleeper berth' : 'Seater chair'}, ${
          isSelected ? 'Selected' : isAvailable ? `Available, Price ₹${item.total_fare}` : 'Sold'
        }`}
      >
        {/* Sleeper berth pillow notch at bottom matching ref-6 & ref-12 */}
        {isSleeper && (
          <View
            style={[
              styles.sleeperPillowNotch,
              {
                backgroundColor: isSelected ? 'rgba(255,255,255,0.4)' : '#E2E8F0',
              },
            ]}
          />
        )}

        {/* Diagonal X for Sold seats matching ref-6 */}
        {isBooked && (
          <View style={styles.crossOverlay}>
            <View style={styles.crossLine1} />
            <View style={styles.crossLine2} />
          </View>
        )}

        {/* Female Icon inside ladies seats */}
        {isFemale && !isSelected && !isBooked && (
          <Ionicons name="woman" size={16} color="#EC4899" />
        )}

        {/* Male Icon inside male seats */}
        {isMale && !isSelected && !isBooked && (
          <Ionicons name="man" size={16} color="#2563EB" />
        )}
      </Pressable>

      {/* Subtext below seat: Price if available, or "Sold" in gray matching ref-6 */}
      <AppText
        variant="caption"
        style={[
          styles.subtextPrice,
          {
            color: isBooked ? '#94A3B8' : '#334155',
            fontWeight: isSelected ? '700' : '600',
          },
        ]}
      >
        {isBooked ? 'Sold' : `₹${item.total_fare}`}
      </AppText>
    </View>
  );
});

export default function SeatMapScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();

  const {
    fromCity,
    toCity,
    journeyDate,
    selectedBus,
    selectedSeats,
    toggleSeat,
  } = useBookingStore();

  const busId = selectedBus?.RouteBusId || selectedBus?.BusId || 6903;
  const { data: chart, isLoading, isError, error, refetch } = useSeatChartQuery(busId, {
    fromCityId: fromCity.providerCityId,
    toCityId: toCity.providerCityId,
    journeyDate,
  });

  // Expandable bus details sheet state
  const [detailsSheetVisible, setDetailsSheetVisible] = useState(false);
  const [sheetInitialTab, setSheetInitialTab] = useState<'cancellation' | 'route' | 'boarding' | 'dropping' | 'amenities'>('cancellation');
  const [fareBreakdownOpen, setFareBreakdownOpen] = useState(false);

  // Partition seats into Lower Deck (1) and Upper Deck (2)
  const { lowerDeckSeats, upperDeckSeats, hasUpperDeck } = useMemo(() => {
    if (!chart?.Layout) return { lowerDeckSeats: [], upperDeckSeats: [], hasUpperDeck: false };
    const lower = chart.Layout.filter((s) => s.deck === 1);
    const upper = chart.Layout.filter((s) => s.deck === 2);
    return {
      lowerDeckSeats: lower,
      upperDeckSeats: upper,
      hasUpperDeck: upper.length > 0,
    };
  }, [chart]);

  // Group lower deck seats by row
  const lowerGroupedRows = useMemo(() => {
    const rowsMap = new Map<number, SeatLayoutItem[]>();
    lowerDeckSeats.forEach((seat) => {
      const r = seat.row;
      if (!rowsMap.has(r)) rowsMap.set(r, []);
      rowsMap.get(r)!.push(seat);
    });
    return Array.from(rowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, seats]) => seats.sort((a, b) => a.column - b.column));
  }, [lowerDeckSeats]);

  // Group upper deck seats by row
  const upperGroupedRows = useMemo(() => {
    const rowsMap = new Map<number, SeatLayoutItem[]>();
    upperDeckSeats.forEach((seat) => {
      const r = seat.row;
      if (!rowsMap.has(r)) rowsMap.set(r, []);
      rowsMap.get(r)!.push(seat);
    });
    return Array.from(rowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, seats]) => seats.sort((a, b) => a.column - b.column));
  }, [upperDeckSeats]);

  const handleSeatToggle = useCallback(
    (seat: SelectedSeatItem) => {
      const success = toggleSeat(seat);
      if (!success) {
        Alert.alert('Seat Limit Exceeded', 'You can select up to 6 seats in a single booking.');
      }
    },
    [toggleSeat]
  );

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.fare, 0);
  }, [selectedSeats]);

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats Selected', 'Please select at least 1 seat to proceed.');
      return;
    }
    router.push('/booking/boarding-dropping' as any);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out bus tickets on AiBus: ${selectedBus?.CompanyName || 'Bus'} from ${fromCity.name} to ${toCity.name} on ${journeyDate}.`,
      });
    } catch {}
  };

  // Formatted date string for bottom peek
  const dateFormatted = useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-IN', { month: 'short' });
      return `${weekday}, ${day} ${month}`;
    } catch {
      return journeyDate;
    }
  }, [journeyDate]);

  const busOperator = selectedBus?.CompanyName || chart?.CompanyName || 'Sri Renu Travels';
  const depTime = (selectedBus?.DepartureTime || chart?.DepartureTime || '14:10').slice(0, 5);
  const arrTime = (selectedBus?.ArrivalTime || chart?.ArrivalTime || '20:30').slice(0, 5);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]} edges={['top']}>
      {/* 1. Header Bar matching ref-6: Back, Title, Subtitle, Share */}
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
          <AppText variant="heading2" style={styles.headerTitle}>
            Select Seats
          </AppText>
          <AppText variant="caption" style={{ color: '#64748B', marginTop: 1 }}>
            {fromCity.name} → {toCity.name}
          </AppText>
        </View>

        <Pressable
          onPress={handleShare}
          style={styles.shareButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share bus details"
        >
          <Ionicons name="share-social-outline" size={22} color="#0F172A" />
        </Pressable>
      </View>

      {/* 2. Decks Area */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#D92D20" />
          <AppText variant="bodyMedium" style={{ marginTop: 14, color: '#64748B' }}>
            Loading seat availability...
          </AppText>
        </View>
      ) : isError ? (
        <AppErrorState
          error={error}
          title="Could not load seat map"
          onRetry={() => refetch()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 }]}
        >
          {/* Side-by-side or scrollable Decks matching ref-6, ref-7, ref-8 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.decksContainer}
          >
            {/* Lower Deck Card */}
            <View style={[styles.deckCard, shadows.sm]}>
              <View style={styles.deckCardHeader}>
                <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                  Lower deck
                </AppText>
                {/* Steering wheel icon at top right matching ref-6 */}
                <MaterialCommunityIcons name="steering" size={28} color="#94A3B8" />
              </View>

              <View style={styles.deckDividerLine} />

              <View style={styles.seatsGrid}>
                {lowerGroupedRows.map((rowSeats, rIdx) => (
                  <View key={`low-r-${rIdx}`} style={styles.rowWrapper}>
                    {rowSeats.map((seat, cIdx) => {
                      const isSelected = selectedSeats.some((s) => s.seatNo === seat.seat_no);
                      // Insert aisle margin if column 1 (sleeper) and column 2 (seater)
                      const isAisle = cIdx === 0 && rowSeats.length > 1;
                      return (
                        <View key={seat.seat_no} style={{ flexDirection: 'row' }}>
                          <SeatCell
                            item={seat}
                            isSelected={isSelected}
                            onToggle={handleSeatToggle}
                            colors={colors}
                            radii={radii}
                          />
                          {isAisle && <View style={styles.aisleGap} />}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Upper Deck Card if exists */}
            {hasUpperDeck && (
              <View style={[styles.deckCard, shadows.sm, { marginLeft: 16 }]}>
                <View style={styles.deckCardHeader}>
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                    Upper deck
                  </AppText>
                </View>

                <View style={styles.deckDividerLine} />

                <View style={styles.seatsGrid}>
                  {upperGroupedRows.map((rowSeats, rIdx) => (
                    <View key={`upp-r-${rIdx}`} style={styles.rowWrapper}>
                      {rowSeats.map((seat, cIdx) => {
                        const isSelected = selectedSeats.some((s) => s.seatNo === seat.seat_no);
                        const isAisle = cIdx === 0 && rowSeats.length > 1;
                        return (
                          <View key={seat.seat_no} style={{ flexDirection: 'row' }}>
                            <SeatCell
                              item={seat}
                              isSelected={isSelected}
                              onToggle={handleSeatToggle}
                              colors={colors}
                              radii={radii}
                            />
                            {isAisle && <View style={styles.aisleGap} />}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </ScrollView>
      )}

      {/* Floating Ray Assistant */}
      <Pressable
        onPress={() => {
          try {
            Haptics.selectionAsync();
          } catch {}
          setDetailsSheetVisible(true);
        }}
        style={styles.floatingRayPill}
        accessibilityRole="button"
        accessibilityLabel="Ask ais AI Assistant"
      >
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
      </Pressable>

      {/* 3. Bottom Peek Sheet matching ref-6 & ref-12 */}
      <View style={[styles.bottomSheetPeek, shadows.lg]}>
        {/* Grab bar handle */}
        <Pressable
          onPress={() => setDetailsSheetVisible(true)}
          style={styles.peekHandleWrap}
          hitSlop={10}
        >
          <View style={styles.peekHandle} />
        </Pressable>

        {/* Bus Info Header row: Primo Sri Renu Travels, 4.6 (527) */}
        <Pressable onPress={() => setDetailsSheetVisible(true)} style={styles.peekBusRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="caption" style={{ color: '#1E3A8A', fontWeight: '800', fontSize: 13 }}>
                Primo{' '}
              </AppText>
              <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
              <AppText variant="bodyLargeBold" numberOfLines={1} style={{ color: '#0F172A' }}>
                {busOperator}
              </AppText>
            </View>
            <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
              {depTime} - {arrTime} · {dateFormatted}
            </AppText>
          </View>

          {/* Green rating badge */}
          <View style={styles.ratingBadgeBox}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
              <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                4.6
              </AppText>
            </View>
            <AppText variant="caption" style={{ color: '#64748B', fontSize: 11, marginTop: 1 }}>
              527
            </AppText>
          </View>
        </Pressable>

        {/* When NO seat is selected: Show informative cards matching ref-6 */}
        {selectedSeats.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.peekBadgesScroll}>
            <Pressable
              onPress={() => {
                setSheetInitialTab('route');
                setDetailsSheetVisible(true);
              }}
              style={styles.busThumbnailCard}
            >
              <Ionicons name="bus" size={24} color="#D92D20" />
            </Pressable>

            <Pressable
              onPress={() => {
                setSheetInitialTab('amenities');
                setDetailsSheetVisible(true);
              }}
              style={[styles.highlightPillCard, { backgroundColor: '#EFF6FF' }]}
            >
              <AppText variant="bodySmallMedium" style={{ color: '#1E293B', fontWeight: '700' }}>
                New Bus
              </AppText>
              <AppText variant="caption" style={{ color: '#64748B' }}>
                4 months old
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => {
                setSheetInitialTab('amenities');
                setDetailsSheetVisible(true);
              }}
              style={[styles.highlightPillCard, { backgroundColor: '#F5F3FF', marginLeft: 8 }]}
            >
              <AppText variant="bodySmallMedium" style={{ color: '#1E293B', fontWeight: '700' }}>
                Women's Choice
              </AppText>
              <AppText variant="caption" style={{ color: '#64748B' }}>
                Highly rated
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => {
                setSheetInitialTab('cancellation');
                setDetailsSheetVisible(true);
              }}
              style={[styles.highlightPillCard, { backgroundColor: '#F0FDF4', marginLeft: 8 }]}
            >
              <AppText variant="bodySmallMedium" style={{ color: '#15803D', fontWeight: '700' }}>
                Free Cancellation
              </AppText>
              <AppText variant="caption" style={{ color: '#166534' }}>
                Up to 6h before
              </AppText>
            </Pressable>
          </ScrollView>
        ) : (
          /* When 1+ seats selected: Show Selection Summary & CTA matching ref-12 */
          <View style={styles.selectedSeatsSection}>
            <View style={styles.seatSummaryRow}>
              <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
              </AppText>

              <Pressable
                onPress={() => setFareBreakdownOpen((p) => !p)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <AppText variant="heading2" style={{ color: '#0F172A', fontWeight: '800' }}>
                  ₹{totalPrice}
                </AppText>
                <Ionicons
                  name={fareBreakdownOpen ? 'chevron-up-circle' : 'add-circle-outline'}
                  size={20}
                  color="#475569"
                  style={{ marginLeft: 6 }}
                />
              </Pressable>
            </View>

            {/* Optional Collapsible Fare Breakdown */}
            {fareBreakdownOpen && (
              <View style={styles.fareBreakdownBox}>
                {selectedSeats.map((s) => (
                  <View key={s.seatNo} style={styles.fareBreakdownRow}>
                    <AppText variant="caption" style={{ color: '#475569' }}>
                      Seat {s.seatNo} ({s.seatType === 2 ? 'Sleeper' : 'Seater'})
                    </AppText>
                    <AppText variant="caption" style={{ color: '#0F172A', fontWeight: '600' }}>
                      ₹{s.fare}
                    </AppText>
                  </View>
                ))}
              </View>
            )}

            {/* Red CTA Button matching ref-12: "Select boarding & dropping points" */}
            <Pressable
              onPress={handleProceed}
              style={({ pressed }) => [
                styles.proceedButton,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select boarding and dropping points"
            >
              <AppText variant="heading3" style={styles.proceedButtonText}>
                Select boarding & dropping points
              </AppText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Expandable Bus Details Bottom Sheet matching ref-10 & ref-11 */}
      <BusDetailsBottomSheet
        visible={detailsSheetVisible}
        onClose={() => setDetailsSheetVisible(false)}
        bus={selectedBus}
        chart={chart}
        journeyDate={journeyDate}
        initialTab={sheetInitialTab}
      />
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    padding: 2,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  shareButton: {
    padding: 4,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  decksContainer: {
    paddingHorizontal: 8,
  },
  deckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    minWidth: 175,
  },
  deckCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 32,
  },
  deckDividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  seatsGrid: {
    alignItems: 'center',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aisleGap: {
    width: 24,
  },
  seatCellContainer: {
    alignItems: 'center',
  },
  seaterShape: {
    width: 44,
    height: 44,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sleeperShape: {
    width: 52,
    height: 92,
    borderRadius: 8,
    borderWidth: 1.8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 6,
  },
  sleeperPillowNotch: {
    width: '78%',
    height: 7,
    borderRadius: 3,
  },
  crossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossLine1: {
    position: 'absolute',
    width: '80%',
    height: 1,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '45deg' }],
  },
  crossLine2: {
    position: 'absolute',
    width: '80%',
    height: 1,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '-45deg' }],
  },
  subtextPrice: {
    marginTop: 4,
    fontSize: 10,
    textAlign: 'center',
  },
  floatingRayPill: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomSheetPeek: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  peekHandleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  peekHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  peekBusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  ratingBadgeBox: {
    alignItems: 'flex-end',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  peekBadgesScroll: {
    marginTop: 14,
  },
  busThumbnailCard: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  highlightPillCard: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
  },
  selectedSeatsSection: {
    marginTop: 14,
  },
  seatSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  fareBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  fareBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  proceedButton: {
    backgroundColor: '#D92D20',
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#D92D20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
