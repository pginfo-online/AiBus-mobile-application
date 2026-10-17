import React, { useState, useMemo } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import { AppText } from '../../design-system/components/AppText';
import { useTranslation } from '../../core/localization';
import { useBookingStore, BoardingDroppingPoint } from '../../stores/bookingStore';

export default function BoardingDroppingScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const {
    fromCity,
    toCity,
    journeyDate,
    selectedBus,
    selectedBoardingPoint,
    selectedDroppingPoint,
    setSelectedBoardingPoint,
    setSelectedDroppingPoint,
  } = useBookingStore();

  // Tab state: 'boarding' | 'dropping'
  const [activeTab, setActiveTab] = useState<'boarding' | 'dropping'>('boarding');

  // Format date for point display (e.g., '18 Oct')
  const boardingDateStr = useMemo(() => {
    try {
      const d = new Date(journeyDate ? journeyDate + 'T00:00:00' : Date.now());
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      return 'Today';
    }
  }, [journeyDate]);

  const droppingDateStr = useMemo(() => {
    try {
      const d = new Date(journeyDate ? journeyDate + 'T00:00:00' : Date.now());
      // Check if arrival is next day (e.g. overnight journey)
      if (selectedBus?.DepartureTime && selectedBus?.ArrivalTime) {
        const depHour = parseInt(selectedBus.DepartureTime.split(':')[0], 10);
        const arrHour = parseInt(selectedBus.ArrivalTime.split(':')[0], 10);
        if (arrHour < depHour) {
          d.setDate(d.getDate() + 1);
        }
      }
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      return 'Tomorrow';
    }
  }, [journeyDate, selectedBus]);

  // Provide robust fallbacks if bus data has empty boarding/dropping arrays
  const boardingList = useMemo(() => {
    if (selectedBus?.BoardingPoints && selectedBus.BoardingPoints.length > 0) {
      return selectedBus.BoardingPoints;
    }
    const cityName = fromCity?.name || 'City';
    return [
      {
        PickupCode: 'BP-DEF-1',
        PickupName: `${cityName} Central Bus Stand Front Entrance`,
        PickupTime: selectedBus?.DepartureTime || '14:10',
        Address: `Omni Bus Stand Front Entrance Near By Fuel Station, ${cityName}`,
        Landmark: 'Central Omni Bus Stand',
      },
      {
        PickupCode: 'BP-DEF-2',
        PickupName: `${cityName} Bypass Junction`,
        PickupTime: '14:40',
        Address: `Near Highway Bypass Flyover, ${cityName}`,
        Landmark: 'Bypass Flyover',
      },
      {
        PickupCode: 'BP-DEF-3',
        PickupName: `${cityName} Toll Gate`,
        PickupTime: '15:15',
        Address: `Before Highway Toll Plaza, ${cityName}`,
        Landmark: 'Toll Plaza',
      },
    ];
  }, [selectedBus, fromCity]);

  const droppingList = useMemo(() => {
    if (selectedBus?.DroppingPoints && selectedBus.DroppingPoints.length > 0) {
      return selectedBus.DroppingPoints;
    }
    const cityName = toCity?.name || 'Destination';
    return [
      {
        DropoffCode: 'DP-DEF-1',
        DropoffName: `${cityName} Bypass Toll Gate`,
        DropoffTime: selectedBus?.ArrivalTime || '20:30',
        Address: `Highway Toll Plaza, ${cityName}`,
        Landmark: 'Toll Plaza',
      },
      {
        DropoffCode: 'DP-DEF-2',
        DropoffName: `${cityName} Central Bus Terminal`,
        DropoffTime: '21:00',
        Address: `Opposite Railway Junction, ${cityName}`,
        Landmark: 'Central Bus Stand',
      },
      {
        DropoffCode: 'DP-DEF-3',
        DropoffName: `${cityName} City Center`,
        DropoffTime: '21:30',
        Address: `Near Clock Tower, Main Road, ${cityName}`,
        Landmark: 'Clock Tower',
      },
    ];
  }, [selectedBus, toCity]);

  const handleSelectBoarding = (item: any) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    const point: BoardingDroppingPoint = {
      code: item.PickupCode,
      name: item.PickupName,
      time: item.PickupTime,
      address: item.Address,
      landmark: item.Landmark,
      contact: item.Contact,
    };
    setSelectedBoardingPoint(point);

    // Auto-transition to Dropping Points tab after a gentle pause so user sees the radio toggle
    setTimeout(() => {
      setActiveTab('dropping');
    }, 200);
  };

  const handleSelectDropping = (item: any) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    const point: BoardingDroppingPoint = {
      code: item.DropoffCode,
      name: item.DropoffName,
      time: item.DropoffTime,
      address: item.Address,
      landmark: item.Landmark,
    };
    setSelectedDroppingPoint(point);
  };

  const handleProceed = () => {
    if (!selectedBoardingPoint) {
      Alert.alert('Incomplete Selection', 'Please select a boarding point.');
      setActiveTab('boarding');
      return;
    }

    if (!selectedDroppingPoint) {
      Alert.alert('Incomplete Selection', 'Please select a dropping point.');
      setActiveTab('dropping');
      return;
    }

    router.push('/booking/passenger-details' as any);
  };

  const isComplete = Boolean(selectedBoardingPoint && selectedDroppingPoint);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      {/* 1. Header Bar matching ref-13 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <AppText variant="heading3" style={[styles.headerTitle, { color: colors.text }]}>
            Select boarding & dropping points
          </AppText>
          <AppText variant="bodySmall" style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {fromCity.name} → {toCity.name}
          </AppText>
        </View>
      </View>

      {/* 2. Top Segmented Tabs matching ref-13 */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Boarding Points Tab */}
        <Pressable
          onPress={() => setActiveTab('boarding')}
          style={styles.tabButton}
        >
          <View style={styles.tabTextWrapper}>
            <AppText
              variant="bodyLargeBold"
              style={[
                styles.tabMainText,
                {
                  color: activeTab === 'boarding' ? colors.text : colors.textSecondary,
                  fontWeight: activeTab === 'boarding' ? '700' : '500',
                },
              ]}
            >
              Boarding points
            </AppText>
            <AppText
              variant="bodySmall"
              style={[
                styles.tabSubText,
                { color: activeTab === 'boarding' ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {fromCity.name}
            </AppText>
          </View>
          {activeTab === 'boarding' && (
            <View style={[styles.activeTabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>

        {/* Dropping Points Tab */}
        <Pressable
          onPress={() => setActiveTab('dropping')}
          style={styles.tabButton}
        >
          <View style={styles.tabTextWrapper}>
            <AppText
              variant="bodyLargeBold"
              style={[
                styles.tabMainText,
                {
                  color: activeTab === 'dropping' ? colors.text : colors.textSecondary,
                  fontWeight: activeTab === 'dropping' ? '700' : '500',
                },
              ]}
            >
              Dropping points
            </AppText>
            <AppText
              variant="bodySmall"
              style={[
                styles.tabSubText,
                { color: activeTab === 'dropping' ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {toCity.name}
            </AppText>
          </View>
          {activeTab === 'dropping' && (
            <View style={[styles.activeTabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>
      </View>

      {/* 3. Main Content Area */}
      <View style={[styles.contentArea, { backgroundColor: '#F4F5F8' }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: isComplete ? 120 : 60 }]}
        >
          {/* Top Rounded Card containing the point list */}
          <View style={[styles.pointsCard, { backgroundColor: colors.surface }]}>
            {/* Card Section Header */}
            <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
              <AppText variant="bodyLargeBold" style={[styles.sectionHeaderText, { color: colors.text }]}>
                {activeTab === 'boarding'
                  ? `All boarding points in ${fromCity.name}`
                  : `All dropping points in ${toCity.name}`}
              </AppText>
            </View>

            {/* List of Points */}
            {activeTab === 'boarding' ? (
              <View>
                {boardingList.map((item: any, idx: number) => {
                  const isSelected = selectedBoardingPoint?.code === item.PickupCode;
                  const isPopular = idx === 0;

                  return (
                    <Pressable
                      key={`bp-${item.PickupCode || idx}`}
                      onPress={() => handleSelectBoarding(item)}
                      style={({ pressed }) => [
                        styles.pointRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: isSelected ? colors.primarySoft : pressed ? colors.surfaceSecondary : colors.surface,
                        },
                      ]}
                    >
                      {/* Left: Time and Date */}
                      <View style={styles.timeColumn}>
                        <AppText variant="bodyLargeBold" style={[styles.timeText, { color: colors.text }]}>
                          {item.PickupTime}
                        </AppText>
                        <AppText variant="caption" style={[styles.dateText, { color: colors.textSecondary }]}>
                          {boardingDateStr}
                        </AppText>
                      </View>

                      {/* Middle: Name, Address, Popular Tag */}
                      <View style={styles.infoColumn}>
                        <AppText variant="bodyLargeBold" style={[styles.pointName, { color: colors.text }]}>
                          {item.PickupName}
                        </AppText>
                        {item.Address && (
                          <AppText variant="bodySmall" style={[styles.pointAddress, { color: colors.textSecondary }]}>
                            {item.Address}
                          </AppText>
                        )}
                        {isPopular && (
                          <View style={styles.popularBadge}>
                            <AppText variant="caption" style={[styles.popularBadgeText, { fontWeight: '700' }]}>
                              Popular boarding point
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Right: Radio Button */}
                      <View style={styles.radioColumn}>
                        {isSelected ? (
                          <View style={[styles.radioOuterSelected, { borderColor: colors.primary }]}>
                            <View style={[styles.radioInnerSelected, { backgroundColor: colors.primary }]} />
                          </View>
                        ) : (
                          <View style={[styles.radioOuterUnselected, { borderColor: '#4B5563' }]} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View>
                {droppingList.map((item: any, idx: number) => {
                  const isSelected = selectedDroppingPoint?.code === item.DropoffCode;
                  const isPopular = idx === 0;

                  return (
                    <Pressable
                      key={`dp-${item.DropoffCode || idx}`}
                      onPress={() => handleSelectDropping(item)}
                      style={({ pressed }) => [
                        styles.pointRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: isSelected ? colors.primarySoft : pressed ? colors.surfaceSecondary : colors.surface,
                        },
                      ]}
                    >
                      {/* Left: Time and Date */}
                      <View style={styles.timeColumn}>
                        <AppText variant="bodyLargeBold" style={[styles.timeText, { color: colors.text }]}>
                          {item.DropoffTime}
                        </AppText>
                        <AppText variant="caption" style={[styles.dateText, { color: colors.textSecondary }]}>
                          {droppingDateStr}
                        </AppText>
                      </View>

                      {/* Middle: Name, Address, Popular Tag */}
                      <View style={styles.infoColumn}>
                        <AppText variant="bodyLargeBold" style={[styles.pointName, { color: colors.text }]}>
                          {item.DropoffName}
                        </AppText>
                        {item.Address && (
                          <AppText variant="bodySmall" style={[styles.pointAddress, { color: colors.textSecondary }]}>
                            {item.Address}
                          </AppText>
                        )}
                        {isPopular && (
                          <View style={styles.popularBadge}>
                            <AppText variant="caption" style={[styles.popularBadgeText, { fontWeight: '700' }]}>
                              Popular dropping point
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Right: Radio Button */}
                      <View style={styles.radioColumn}>
                        {isSelected ? (
                          <View style={[styles.radioOuterSelected, { borderColor: colors.primary }]}>
                            <View style={[styles.radioInnerSelected, { backgroundColor: colors.primary }]} />
                          </View>
                        ) : (
                          <View style={[styles.radioOuterUnselected, { borderColor: '#4B5563' }]} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* 4. Bottom Sticky Action Bar */}
      {isComplete && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              ...shadows.lg,
            },
          ]}
        >
          <View style={styles.selectionSummaryRow}>
            <View style={styles.pointSummaryBox}>
              <View style={styles.summaryTagRow}>
                <View style={[styles.dotIndicator, { backgroundColor: colors.success }]} />
                <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Boarding:
                </AppText>
              </View>
              <AppText variant="caption" numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>
                {selectedBoardingPoint?.name} ({selectedBoardingPoint?.time})
              </AppText>
            </View>

            <View style={styles.pointSummaryBox}>
              <View style={styles.summaryTagRow}>
                <View style={[styles.dotIndicator, { backgroundColor: colors.primary }]} />
                <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Dropping:
                </AppText>
              </View>
              <AppText variant="caption" numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>
                {selectedDroppingPoint?.name} ({selectedDroppingPoint?.time})
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={handleProceed}
            style={({ pressed }) => [
              styles.proceedButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <AppText variant="bodyLargeBold" style={styles.proceedButtonText}>
              {t('points.proceed_passengers') || 'Continue to Passenger Details'}
            </AppText>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    paddingRight: 14,
    paddingVertical: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextWrapper: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabMainText: {
    fontSize: 15,
  },
  tabSubText: {
    fontSize: 13,
    marginTop: 2,
  },
  activeTabIndicator: {
    height: 3,
    width: '100%',
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
  },
  pointsCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    minHeight: '100%',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  timeColumn: {
    width: 62,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginTop: 3,
  },
  infoColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pointName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  pointAddress: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  popularBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  popularBadgeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '600',
  },
  radioColumn: {
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  radioOuterUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  radioOuterSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  selectionSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  pointSummaryBox: {
    flex: 1,
  },
  summaryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  proceedButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
