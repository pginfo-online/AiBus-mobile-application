import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppBadge,
  AppDivider,
  AppErrorState,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore, SelectedSeatItem } from '../../stores/bookingStore';
import { useSeatChartQuery } from '../../features/seats/useSeatChartQuery';
import { SeatLayoutItem } from '../../types/api';

// Memoized individual seat cell component for high rendering performance
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
  radii,
}: SeatCellProps) {
  // Seat statuses: 1 = Available, 0 = Blocked, 2 = Male, 3 = Female, -2 = Booked by M, -3 = Booked by F
  const isAvailable = item.seat_status === 1 || item.seat_status === 2 || item.seat_status === 3;
  const isBooked = item.seat_status === 0 || item.seat_status === -2 || item.seat_status === -3;
  const isFemale = item.seat_status === 3 || item.seat_status === -3;
  const isSleeper = item.seat_type === 2;

  let backgroundColor = colors.surface;
  let borderColor = colors.seatAvailableBorder;
  let textColor = colors.text;

  if (isSelected) {
    backgroundColor = colors.seatSelected;
    borderColor = colors.seatSelected;
    textColor = '#FFFFFF';
  } else if (isBooked) {
    backgroundColor = colors.seatBooked;
    borderColor = colors.seatBookedBorder;
    textColor = colors.textMuted;
  } else if (isFemale) {
    backgroundColor = colors.seatFemaleSoft;
    borderColor = colors.seatFemale;
    textColor = colors.seatFemale;
  }

  const handlePress = () => {
    if (!isAvailable) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // Safe fallback
      }
      return;
    }

    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }

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

  // Dimensions based on sleeper vs seater
  const cellWidth = isSleeper ? 64 : 44;
  const cellHeight = isSleeper ? 44 : 42;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isBooked}
      style={({ pressed }) => [
        styles.seatBase,
        {
          width: cellWidth,
          height: cellHeight,
          backgroundColor,
          borderColor,
          borderRadius: radii.sm,
          opacity: pressed && isAvailable ? 0.75 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Seat ${item.seat_no}, ${isSleeper ? 'Sleeper' : 'Seater'}, ${
        isSelected ? 'Selected' : isAvailable ? `Available, Price ₹${item.total_fare}` : 'Booked'
      }`}
    >
      {/* Visual pillow / notch for sleeper beds */}
      {isSleeper && (
        <View
          style={[
            styles.sleeperPillow,
            {
              backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : colors.border,
            },
          ]}
        />
      )}
      <AppText
        variant="caption"
        style={{
          color: textColor,
          fontWeight: isSelected ? '700' : '600',
          fontSize: 11,
        }}
      >
        {item.seat_no}
      </AppText>
      {!isBooked && (
        <AppText
          variant="caption"
          style={{
            color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textSecondary,
            fontSize: 9,
            marginTop: 1,
          }}
        >
          ₹{item.total_fare}
        </AppText>
      )}
    </Pressable>
  );
});

export default function SeatMapScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const {
    fromCity,
    toCity,
    journeyDate,
    selectedBus,
    selectedSeats,
    toggleSeat,
  } = useBookingStore();

  const busId = selectedBus?.RouteBusId || selectedBus?.BusId;
  const { data: chart, isLoading, isError, error, refetch } = useSeatChartQuery(busId, {
    fromCityId: fromCity.providerCityId,
    toCityId: toCity.providerCityId,
    journeyDate,
  });

  // Deck tab: 1 = Lower Deck, 2 = Upper Deck
  const [activeDeck, setActiveDeck] = useState<number>(1);

  // Partition seats into Lower & Upper Deck
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

  // Group deck seats into rows for grid rendering
  const activeDeckSeats = activeDeck === 1 ? lowerDeckSeats : upperDeckSeats;
  const groupedRows = useMemo(() => {
    const rowsMap = new Map<number, SeatLayoutItem[]>();
    activeDeckSeats.forEach((seat) => {
      const r = seat.row;
      if (!rowsMap.has(r)) rowsMap.set(r, []);
      rowsMap.get(r)!.push(seat);
    });

    return Array.from(rowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, seats]) => seats.sort((a, b) => a.column - b.column));
  }, [activeDeckSeats]);

  const handleSeatToggle = useCallback(
    (seat: SelectedSeatItem) => {
      const success = toggleSeat(seat);
      if (!success) {
        Alert.alert('Seat Limit Exceeded', 'You can select up to 6 seats in a single booking.');
      }
    },
    [toggleSeat]
  );

  // Compute total payable price from selected seats
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
            {selectedBus?.CompanyName || 'Select Seats'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 1 }}>
            {fromCity.name} → {toCity.name}
          </AppText>
        </View>
      </View>

      {/* 2. Visual Seat Legend */}
      <View
        style={[
          styles.legendBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { borderColor: colors.seatAvailableBorder, backgroundColor: colors.surface }]} />
          <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            {t('seats.available')}
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { borderColor: colors.seatSelected, backgroundColor: colors.seatSelected }]} />
          <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            {t('seats.selected')}
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { borderColor: colors.seatBookedBorder, backgroundColor: colors.seatBooked }]} />
          <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            {t('seats.booked')}
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { borderColor: colors.seatFemale, backgroundColor: colors.seatFemaleSoft }]} />
          <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            {t('seats.ladies')}
          </AppText>
        </View>
      </View>

      {/* 3. Deck Selector Tabs (if Upper Deck exists) */}
      {hasUpperDeck && (
        <View style={[styles.deckTabContainer, { backgroundColor: colors.surfaceSecondary }]}>
          <Pressable
            onPress={() => setActiveDeck(1)}
            style={[
              styles.deckTabButton,
              activeDeck === 1 && {
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                ...shadows.xs,
              },
            ]}
          >
            <AppText
              variant="bodySmallMedium"
              style={{
                color: activeDeck === 1 ? colors.primary : colors.textSecondary,
                fontWeight: activeDeck === 1 ? '700' : '500',
              }}
            >
              {t('seats.lower_deck')}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setActiveDeck(2)}
            style={[
              styles.deckTabButton,
              activeDeck === 2 && {
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                ...shadows.xs,
              },
            ]}
          >
            <AppText
              variant="bodySmallMedium"
              style={{
                color: activeDeck === 2 ? colors.primary : colors.textSecondary,
                fontWeight: activeDeck === 2 ? '700' : '500',
              }}
            >
              {t('seats.upper_deck')}
            </AppText>
          </Pressable>
        </View>
      )}

      {/* 4. Seat Map Vehicle Container */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="bodyMedium" style={{ marginTop: 12, color: colors.textSecondary }}>
            Loading live seat availability...
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
          contentContainerStyle={[styles.seatMapScroll, { paddingBottom: 120 }]}
        >
          <View
            style={[
              styles.busChassis,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                borderRadius: radii.xl,
              },
            ]}
          >
            {/* Front of vehicle & Driver cabin indicator */}
            <View style={[styles.driverCabin, { borderBottomColor: colors.border }]}>
              <View style={styles.steeringIndicator}>
                <Ionicons name="compass-outline" size={20} color={colors.textMuted} />
                <AppText variant="caption" style={{ color: colors.textMuted, marginLeft: 6 }}>
                  {t('seats.steering')}
                </AppText>
              </View>
            </View>

            {/* Rows of seats */}
            <View style={styles.seatsArea}>
              {groupedRows.map((rowSeats, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.seatRow}>
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeats.some((s) => s.seatNo === seat.seat_no);
                    return (
                      <SeatCell
                        key={`seat-${seat.seat_no}`}
                        item={seat}
                        isSelected={isSelected}
                        onToggle={handleSeatToggle}
                        colors={colors}
                        radii={radii}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* 5. Persistent Bottom Summary Bar */}
      {selectedSeats.length > 0 && (
        <View
          style={[
            styles.bottomSummaryBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: colors.border,
              ...shadows.lg,
            },
          ]}
        >
          <View style={styles.summaryTextColumn}>
            <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
              {selectedSeats.map((s) => s.seatNo).join(', ')} ({selectedSeats.length})
            </AppText>
            <AppText variant="priceMedium" style={{ color: colors.primary, marginTop: 2 }}>
              ₹{totalPrice}
            </AppText>
          </View>

          <AppButton
            title={t('seats.proceed_points')}
            onPress={handleProceed}
            variant="primary"
            size="md"
            icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          />
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
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  deckTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
  },
  deckTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatMapScroll: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  busChassis: {
    width: 320,
    borderWidth: 2,
    padding: 16,
    elevation: 3,
  },
  driverCabin: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  steeringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsArea: {
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  seatBase: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  sleeperPillow: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  bottomSummaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  summaryTextColumn: {
    flex: 1,
    marginRight: 12,
  },
});
