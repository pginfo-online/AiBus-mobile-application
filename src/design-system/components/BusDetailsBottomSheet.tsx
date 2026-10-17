import React, { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';
import { SeatChartResponseData, BoardingPoint, DroppingPoint } from '../../types/api';

interface BusDetailsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  bus: any;
  chart?: SeatChartResponseData | null;
  journeyDate: string;
  initialTab?: 'cancellation' | 'route' | 'boarding' | 'dropping' | 'amenities';
}

type TabKey = 'cancellation' | 'route' | 'boarding' | 'dropping' | 'amenities';

export function BusDetailsBottomSheet({
  visible,
  onClose,
  bus,
  chart,
  journeyDate,
  initialTab = 'cancellation',
}: BusDetailsBottomSheetProps) {
  const { colors, radii } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  React.useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const boardingPoints = chart?.BoardingPoints || bus?.BoardingPoints || [];
  const droppingPoints = chart?.DroppingPoints || bus?.DroppingPoints || [];

  // Formatted journey date display e.g. "18 Oct"
  const dateFormatted = React.useMemo(() => {
    try {
      const parts = journeyDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return journeyDate;
    }
  }, [journeyDate]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <SafeAreaView
          style={[styles.sheetContainer, { backgroundColor: colors.surface }]}
          edges={['bottom']}
        >
          {/* Top Grab Handle */}
          <View style={styles.grabHandleWrapper}>
            <View style={styles.grabHandle} />
          </View>

          {/* Close 'X' button on top right matching ref-10 & ref-11 */}
          <View style={styles.topBar}>
            <View style={styles.busInfoSnippet}>
              <AppText variant="bodyLargeBold" numberOfLines={1} style={{ color: '#0F172A' }}>
                {bus?.CompanyName || 'Bus Details'}
              </AppText>
              <AppText variant="caption" style={{ color: '#64748B' }}>
                {bus?.BusTypeName || 'A/C Seater / Sleeper'}
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.circleCloseBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close bus details"
            >
              <Ionicons name="close" size={22} color="#0F172A" />
            </Pressable>
          </View>

          {/* Navigation Tabs Strip matching ref-10 & ref-11 */}
          <View style={[styles.tabStrip, { borderBottomColor: '#E2E8F0' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              <Pressable
                onPress={() => setActiveTab('cancellation')}
                style={[styles.tabItem, activeTab === 'cancellation' && styles.tabItemActive]}
              >
                <AppText
                  variant="bodySmallMedium"
                  style={[styles.tabLabel, activeTab === 'cancellation' ? styles.tabLabelActive : { color: '#64748B' }]}
                >
                  Cancellation policy
                </AppText>
                {activeTab === 'cancellation' && <View style={styles.tabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('boarding')}
                style={[styles.tabItem, activeTab === 'boarding' && styles.tabItemActive]}
              >
                <AppText
                  variant="bodySmallMedium"
                  style={[styles.tabLabel, activeTab === 'boarding' ? styles.tabLabelActive : { color: '#64748B' }]}
                >
                  Boarding points
                </AppText>
                {activeTab === 'boarding' && <View style={styles.tabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('dropping')}
                style={[styles.tabItem, activeTab === 'dropping' && styles.tabItemActive]}
              >
                <AppText
                  variant="bodySmallMedium"
                  style={[styles.tabLabel, activeTab === 'dropping' ? styles.tabLabelActive : { color: '#64748B' }]}
                >
                  Dropping points
                </AppText>
                {activeTab === 'dropping' && <View style={styles.tabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('route')}
                style={[styles.tabItem, activeTab === 'route' && styles.tabItemActive]}
              >
                <AppText
                  variant="bodySmallMedium"
                  style={[styles.tabLabel, activeTab === 'route' ? styles.tabLabelActive : { color: '#64748B' }]}
                >
                  Bus route
                </AppText>
                {activeTab === 'route' && <View style={styles.tabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('amenities')}
                style={[styles.tabItem, activeTab === 'amenities' && styles.tabItemActive]}
              >
                <AppText
                  variant="bodySmallMedium"
                  style={[styles.tabLabel, activeTab === 'amenities' ? styles.tabLabelActive : { color: '#64748B' }]}
                >
                  Amenities
                </AppText>
                {activeTab === 'amenities' && <View style={styles.tabIndicator} />}
              </Pressable>
            </ScrollView>
          </View>

          {/* Content Area */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentScroll}>
            {/* 1. Cancellation Policy Tab matching ref-10 */}
            {activeTab === 'cancellation' && (
              <View>
                <AppText variant="heading2" style={styles.sectionHeading}>
                  Cancellation policy
                </AppText>

                {/* Table matching ref-10 */}
                <View style={styles.tableCard}>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.colTimeHeader}>
                      <AppText variant="bodySmallMedium" style={styles.tableHeaderText}>
                        Cancellation Time
                      </AppText>
                    </View>
                    <View style={styles.colStandardHeader}>
                      <AppText variant="bodySmallMedium" style={styles.tableHeaderText}>
                        Without free{'\n'}cancellation
                      </AppText>
                    </View>
                    <View style={styles.colFreeHeader}>
                      <AppText variant="bodySmallMedium" style={styles.tableHeaderText}>
                        With free{'\n'}cancellation
                      </AppText>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {[
                    { time: 'Before 24h departure', std: '90% refund', free: '100% refund', check: true },
                    { time: '12h to 24h before', std: '75% refund', free: '100% refund', check: true },
                    { time: '6h to 12h before', std: '50% refund', free: '100% refund', check: true },
                    { time: '3h to 6h before', std: '25% refund', free: '100% refund', check: true },
                    { time: 'Within 3h of departure', std: 'No refund', free: 'No refund', check: false },
                  ].map((row, idx) => (
                    <View key={idx} style={[styles.tableDataRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                      <View style={styles.colTime}>
                        <AppText variant="caption" style={styles.dataTimeText}>
                          {row.time}
                        </AppText>
                      </View>
                      <View style={styles.colStandard}>
                        <AppText variant="caption" style={{ color: '#0F172A', fontWeight: '600' }}>
                          {row.std}
                        </AppText>
                      </View>
                      <View style={[styles.colFree, { backgroundColor: '#F0FDF4' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AppText
                            variant="caption"
                            style={{
                              color: row.check ? '#15803D' : '#64748B',
                              fontWeight: '700',
                              marginRight: 4,
                            }}
                          >
                            {row.free}
                          </AppText>
                          {row.check && (
                            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Free Cancellation Card Promo matching ref-10 */}
                <View style={styles.freeCancPromoCard}>
                  <View style={styles.shieldIconWrap}>
                    <Ionicons name="shield-checkmark" size={24} color="#D92D20" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                      Add <AppText variant="bodyLargeBold" style={{ color: '#D92D20' }}>Free Cancellation </AppText>
                      while booking
                    </AppText>
                    <AppText variant="caption" style={{ color: '#64748B', marginTop: 3 }}>
                      Cancel anytime up to 6 hours before bus departure for a 100% refund.
                    </AppText>
                  </View>
                </View>

                {/* Explanatory notes */}
                <AppText variant="caption" style={styles.policyFootnote}>
                  * Cancellation charges are computed on a per seat basis. Above cancellation fare is calculated based on base fare of ₹{bus?.TotalFare || 449}.
                </AppText>
              </View>
            )}

            {/* 2. Boarding Points Tab matching ref-11 */}
            {activeTab === 'boarding' && (
              <View>
                <AppText variant="heading2" style={styles.sectionHeading}>
                  Boarding points
                </AppText>
                <AppText variant="caption" style={styles.subCityHeading}>
                  {bus?.fromCityName || 'Origin city'}
                </AppText>

                <View style={styles.timelineContainer}>
                  {boardingPoints.map((bp: BoardingPoint, idx: number) => {
                    const isLast = idx === boardingPoints.length - 1;
                    return (
                      <View key={bp.PickupCode || idx} style={styles.timelineRow}>
                        {/* Time & Date */}
                        <View style={styles.timelineTimeBox}>
                          <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                            {bp.PickupTime?.slice(0, 5) || '14:10'}
                          </AppText>
                          <AppText variant="caption" style={{ color: '#64748B' }}>
                            {dateFormatted}
                          </AppText>
                        </View>

                        {/* Dot & Connecting line */}
                        <View style={styles.timelineTrack}>
                          <View style={styles.timelineDot} />
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        {/* Point Details */}
                        <View style={styles.timelineDetailsBox}>
                          <AppText variant="bodyLargeBold" style={styles.pointTitle}>
                            {bp.PickupName}
                          </AppText>
                          {bp.Address && (
                            <AppText variant="caption" style={styles.pointSubtitle}>
                              {bp.Address}
                            </AppText>
                          )}
                          {bp.Landmark && (
                            <AppText variant="caption" style={[styles.pointSubtitle, { color: '#94A3B8' }]}>
                              Landmark: {bp.Landmark}
                            </AppText>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. Dropping Points Tab matching ref-11 */}
            {activeTab === 'dropping' && (
              <View>
                <AppText variant="heading2" style={styles.sectionHeading}>
                  Dropping points
                </AppText>
                <AppText variant="caption" style={styles.subCityHeading}>
                  {bus?.toCityName || 'Destination city'}
                </AppText>

                <View style={styles.timelineContainer}>
                  {droppingPoints.map((dp: DroppingPoint, idx: number) => {
                    const isLast = idx === droppingPoints.length - 1;
                    return (
                      <View key={dp.DropoffCode || idx} style={styles.timelineRow}>
                        {/* Time & Date */}
                        <View style={styles.timelineTimeBox}>
                          <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                            {dp.DropoffTime?.slice(0, 5) || '20:30'}
                          </AppText>
                          <AppText variant="caption" style={{ color: '#64748B' }}>
                            {dateFormatted}
                          </AppText>
                        </View>

                        {/* Dot & Connecting line */}
                        <View style={styles.timelineTrack}>
                          <View style={[styles.timelineDot, { backgroundColor: '#DC2626' }]} />
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        {/* Point Details */}
                        <View style={styles.timelineDetailsBox}>
                          <AppText variant="bodyLargeBold" style={styles.pointTitle}>
                            {dp.DropoffName}
                          </AppText>
                          {dp.Address && (
                            <AppText variant="caption" style={styles.pointSubtitle}>
                              {dp.Address}
                            </AppText>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. Bus Route Overview */}
            {activeTab === 'route' && (
              <View>
                <AppText variant="heading2" style={styles.sectionHeading}>
                  Complete Bus Route
                </AppText>

                <View style={[styles.freeCancPromoCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', marginTop: 12 }]}>
                  <Ionicons name="map-outline" size={24} color="#0284C7" />
                  <View style={{ marginLeft: 12 }}>
                    <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                      {bus?.CompanyName} Express Corridor
                    </AppText>
                    <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
                      Departure: {bus?.DepartureTime?.slice(0, 5)} · Arrival: {bus?.ArrivalTime?.slice(0, 5)}
                    </AppText>
                  </View>
                </View>

                <View style={{ marginTop: 16 }}>
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A', marginBottom: 12 }}>
                    Scheduled Stops:
                  </AppText>
                  {boardingPoints.concat(droppingPoints as any).map((pt: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' }}>
                      <Ionicons name="location" size={16} color={i < boardingPoints.length ? '#16A34A' : '#DC2626'} />
                      <AppText variant="bodyMedium" style={{ marginLeft: 10, color: '#0F172A', flex: 1 }}>
                        {pt.PickupName || pt.DropoffName}
                      </AppText>
                      <AppText variant="caption" style={{ color: '#64748B' }}>
                        {(pt.PickupTime || pt.DropoffTime)?.slice(0, 5)}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 5. Amenities Tab */}
            {activeTab === 'amenities' && (
              <View>
                <AppText variant="heading2" style={styles.sectionHeading}>
                  Bus Amenities
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
                  {[
                    { name: 'Water Bottle', icon: 'water-outline' },
                    { name: 'Charging Point', icon: 'battery-charging-outline' },
                    { name: 'WiFi', icon: 'wifi-outline' },
                    { name: 'Air Conditioning', icon: 'snow-outline' },
                    { name: 'Reading Light', icon: 'bulb-outline' },
                    { name: 'Blankets', icon: 'bed-outline' },
                    { name: 'Emergency Exit', icon: 'exit-outline' },
                    { name: 'GPS Live Tracking', icon: 'navigate-outline' },
                  ].map((amenity, idx) => (
                    <View key={idx} style={styles.amenityCard}>
                      <Ionicons name={amenity.icon as any} size={22} color="#D92D20" />
                      <AppText variant="bodyMedium" style={{ marginLeft: 10, color: '#0F172A', fontWeight: '600' }}>
                        {amenity.name}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  busInfoSnippet: {
    flex: 1,
    marginRight: 12,
  },
  circleCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabStrip: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 14,
  },
  tabLabelActive: {
    color: '#D92D20',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 3,
    backgroundColor: '#D92D20',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subCityHeading: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  colTimeHeader: {
    flex: 1.4,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  colStandardHeader: {
    flex: 1.2,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  colFreeHeader: {
    flex: 1.3,
    padding: 12,
    backgroundColor: '#F0FDF4',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  colTime: {
    flex: 1.4,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  colStandard: {
    flex: 1.2,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  colFree: {
    flex: 1.3,
    padding: 12,
    justifyContent: 'center',
  },
  dataTimeText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  freeCancPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  shieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyFootnote: {
    color: '#94A3B8',
    marginTop: 14,
    lineHeight: 16,
    fontSize: 11,
  },
  timelineContainer: {
    marginTop: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineTimeBox: {
    width: 65,
  },
  timelineTrack: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    marginTop: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 4,
  },
  timelineDetailsBox: {
    flex: 1,
    marginLeft: 10,
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pointSubtitle: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 12,
  },
  amenityCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginRight: '2%',
    marginBottom: 10,
  },
});
