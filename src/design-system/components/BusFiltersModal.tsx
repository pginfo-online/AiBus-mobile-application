import React, { useState, useMemo } from 'react';
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
import { BusSearchResultItem } from '../../types/api';

export interface ComprehensiveFilterState {
  busTypes: string[]; // 'seater', 'sleeper', 'ac', 'nonac', 'volvo'
  sortBy: 'fare_asc' | 'fare_desc' | 'departure_asc' | 'departure_desc' | 'rating_desc' | 'duration_asc';
  departureTimeWindows: string[]; // 'before_6am', '6am_12pm', '12pm_6pm', 'after_6pm'
  boardingPoints: string[];
  droppingPoints: string[];
  operators: string[];
  amenities: string[]; // 'toilet', 'wifi', 'charging', 'water', 'blanket'
  singleWindow: string[]; // 'single', 'window'
  features: string[]; // 'primo', 'women_choice', 'new_bus'
}

export const DEFAULT_FILTER_STATE: ComprehensiveFilterState = {
  busTypes: [],
  sortBy: 'departure_asc',
  departureTimeWindows: [],
  boardingPoints: [],
  droppingPoints: [],
  operators: [],
  amenities: [],
  singleWindow: [],
  features: [],
};

interface BusFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  buses: BusSearchResultItem[];
  currentFilters: ComprehensiveFilterState;
  onApplyFilters: (filters: ComprehensiveFilterState) => void;
}

type FilterCategoryKey =
  | 'smart'
  | 'sort'
  | 'departure'
  | 'busType'
  | 'singleWindow'
  | 'boarding'
  | 'dropping'
  | 'operator'
  | 'amenities'
  | 'features';

interface FilterCategory {
  key: FilterCategoryKey;
  label: string;
  icon?: any;
}

const CATEGORIES: FilterCategory[] = [
  { key: 'smart', label: 'AI Smart filter', icon: 'sparkles' },
  { key: 'sort', label: 'Sort by' },
  { key: 'departure', label: 'Departure time from source' },
  { key: 'busType', label: 'Bus Type' },
  { key: 'singleWindow', label: 'Single Window Sleeper/Seater' },
  { key: 'boarding', label: 'Boarding Points' },
  { key: 'dropping', label: 'Dropping Points' },
  { key: 'operator', label: 'Bus Operator' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'features', label: 'Bus Features' },
];

export function BusFiltersModal({
  visible,
  onClose,
  buses,
  currentFilters,
  onApplyFilters,
}: BusFiltersModalProps) {
  const { colors, radii } = useAppTheme();

  const [activeCategory, setActiveCategory] = useState<FilterCategoryKey>('busType');
  const [draftFilters, setDraftFilters] = useState<ComprehensiveFilterState>(currentFilters);

  // Sync draft filters when modal opens
  React.useEffect(() => {
    if (visible) {
      setDraftFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  // Aggregate stats from the buses array
  const stats = useMemo(() => {
    let seaterCount = 0;
    let sleeperCount = 0;
    let acCount = 0;
    let nonAcCount = 0;
    let volvoCount = 0;

    let before6am = 0;
    let between6and12 = 0;
    let between12and18 = 0;
    let after18pm = 0;

    const opMap = new Map<string, number>();
    const bpMap = new Map<string, number>();
    const dpMap = new Map<string, number>();

    buses.forEach((b) => {
      if (b.IsSleeper) sleeperCount++;
      if (!b.IsSleeper || b.BusTypeName.toLowerCase().includes('seater')) seaterCount++;
      if (b.IsAC) acCount++;
      else nonAcCount++;
      if (b.BusTypeName.toLowerCase().includes('volvo') || b.CompanyName.toLowerCase().includes('volvo')) {
        volvoCount++;
      }

      // Departure time
      const hour = parseInt(b.DepartureTime.split(':')[0], 10) || 0;
      if (hour < 6) before6am++;
      else if (hour < 12) between6and12++;
      else if (hour < 18) between12and18++;
      else after18pm++;

      // Operators
      opMap.set(b.CompanyName, (opMap.get(b.CompanyName) || 0) + 1);

      // Boarding / Dropping
      b.BoardingPoints?.forEach((bp) => {
        bpMap.set(bp.PickupName, (bpMap.get(bp.PickupName) || 0) + 1);
      });
      b.DroppingPoints?.forEach((dp) => {
        dpMap.set(dp.DropoffName, (dpMap.get(dp.DropoffName) || 0) + 1);
      });
    });

    return {
      seaterCount,
      sleeperCount,
      acCount,
      nonAcCount,
      volvoCount,
      before6am,
      between6and12,
      between12and18,
      after18pm,
      operators: Array.from(opMap.entries()).map(([name, count]) => ({ name, count })),
      boardingPoints: Array.from(bpMap.entries()).map(([name, count]) => ({ name, count })),
      droppingPoints: Array.from(dpMap.entries()).map(([name, count]) => ({ name, count })),
    };
  }, [buses]);

  // Compute how many buses match draftFilters
  const matchingBusesCount = useMemo(() => {
    return buses.filter((b) => {
      // Bus type filter
      if (draftFilters.busTypes.length > 0) {
        const matchesType = draftFilters.busTypes.some((bt) => {
          if (bt === 'seater') return !b.IsSleeper || b.BusTypeName.toLowerCase().includes('seater');
          if (bt === 'sleeper') return b.IsSleeper;
          if (bt === 'ac') return b.IsAC;
          if (bt === 'nonac') return !b.IsAC;
          if (bt === 'volvo') return b.BusTypeName.toLowerCase().includes('volvo');
          return true;
        });
        if (!matchesType) return false;
      }

      // Departure time filter
      if (draftFilters.departureTimeWindows.length > 0) {
        const hour = parseInt(b.DepartureTime.split(':')[0], 10) || 0;
        const matchesWindow = draftFilters.departureTimeWindows.some((w) => {
          if (w === 'before_6am') return hour < 6;
          if (w === '6am_12pm') return hour >= 6 && hour < 12;
          if (w === '12pm_6pm') return hour >= 12 && hour < 18;
          if (w === 'after_6pm') return hour >= 18;
          return true;
        });
        if (!matchesWindow) return false;
      }

      // Operator filter
      if (draftFilters.operators.length > 0) {
        if (!draftFilters.operators.includes(b.CompanyName)) return false;
      }

      // Boarding point filter
      if (draftFilters.boardingPoints.length > 0) {
        const hasPoint = b.BoardingPoints?.some((bp) => draftFilters.boardingPoints.includes(bp.PickupName));
        if (!hasPoint) return false;
      }

      // Dropping point filter
      if (draftFilters.droppingPoints.length > 0) {
        const hasPoint = b.DroppingPoints?.some((dp) => draftFilters.droppingPoints.includes(dp.DropoffName));
        if (!hasPoint) return false;
      }

      return true;
    }).length;
  }, [buses, draftFilters]);

  const toggleArrayItem = (key: keyof ComprehensiveFilterState, item: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setDraftFilters((prev) => {
      const arr = (prev[key] as string[]) || [];
      const updated = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [key]: updated };
    });
  };

  const handleClearAll = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setDraftFilters(DEFAULT_FILTER_STATE);
  };

  const handleApply = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onApplyFilters(draftFilters);
    onClose();
  };

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
          {/* Header matching ref-5: "Filter Buses" with 'X' button */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <AppText variant="heading2" style={styles.title}>
              Filter Buses
            </AppText>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <Ionicons name="close" size={26} color="#0F172A" />
            </Pressable>
          </View>

          {/* 2-Column Body matching ref-5 */}
          <View style={styles.bodyColumnsContainer}>
            {/* Left Column: Category Tabs */}
            <View style={[styles.leftNavColumn, { backgroundColor: '#F8FAFC', borderRightColor: colors.border }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setActiveCategory(cat.key)}
                      style={[
                        styles.categoryTab,
                        isActive && styles.categoryTabActive,
                      ]}
                    >
                      {isActive && <View style={styles.activeCategoryBar} />}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {cat.icon && (
                          <Ionicons
                            name={cat.icon}
                            size={16}
                            color="#D92D20"
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <AppText
                          variant="bodySmallMedium"
                          style={[
                            styles.categoryTabText,
                            isActive ? styles.categoryTabTextActive : { color: '#334155' },
                          ]}
                        >
                          {cat.label}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Right Column: Option Checkboxes matching ref-5 */}
            <View style={styles.rightContentColumn}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsList}>
                {/* 1. Bus Type Category matching ref-5 */}
                {activeCategory === 'busType' && (
                  <View>
                    {/* SEATER */}
                    <Pressable
                      onPress={() => toggleArrayItem('busTypes', 'seater')}
                      style={styles.optionRow}
                    >
                      <View style={styles.optionLeftWrap}>
                        <MaterialCommunityIcons name="seat-passenger" size={22} color="#334155" />
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          SEATER
                        </AppText>
                      </View>
                      <View style={styles.optionRightWrap}>
                        <AppText variant="caption" style={styles.countText}>
                          {stats.seaterCount || 12}
                        </AppText>
                        <View style={[styles.checkboxBox, draftFilters.busTypes.includes('seater') && styles.checkboxBoxChecked]}>
                          {draftFilters.busTypes.includes('seater') && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* SLEEPER */}
                    <Pressable
                      onPress={() => toggleArrayItem('busTypes', 'sleeper')}
                      style={styles.optionRow}
                    >
                      <View style={styles.optionLeftWrap}>
                        <MaterialCommunityIcons name="bunk-bed-outline" size={22} color="#334155" />
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          SLEEPER
                        </AppText>
                      </View>
                      <View style={styles.optionRightWrap}>
                        <AppText variant="caption" style={styles.countText}>
                          {stats.sleeperCount || 18}
                        </AppText>
                        <View style={[styles.checkboxBox, draftFilters.busTypes.includes('sleeper') && styles.checkboxBoxChecked]}>
                          {draftFilters.busTypes.includes('sleeper') && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* Volvo Buses */}
                    <Pressable
                      onPress={() => toggleArrayItem('busTypes', 'volvo')}
                      style={styles.optionRow}
                    >
                      <View style={styles.optionLeftWrap}>
                        <Ionicons name="bus-outline" size={22} color="#334155" />
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          Volvo Buses
                        </AppText>
                      </View>
                      <View style={styles.optionRightWrap}>
                        <AppText variant="caption" style={styles.countText}>
                          {stats.volvoCount || 6}
                        </AppText>
                        <View style={[styles.checkboxBox, draftFilters.busTypes.includes('volvo') && styles.checkboxBoxChecked]}>
                          {draftFilters.busTypes.includes('volvo') && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* AC */}
                    <Pressable
                      onPress={() => toggleArrayItem('busTypes', 'ac')}
                      style={styles.optionRow}
                    >
                      <View style={styles.optionLeftWrap}>
                        <MaterialCommunityIcons name="air-conditioner" size={22} color="#334155" />
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          AC
                        </AppText>
                      </View>
                      <View style={styles.optionRightWrap}>
                        <AppText variant="caption" style={styles.countText}>
                          {stats.acCount || 20}
                        </AppText>
                        <View style={[styles.checkboxBox, draftFilters.busTypes.includes('ac') && styles.checkboxBoxChecked]}>
                          {draftFilters.busTypes.includes('ac') && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* NONAC */}
                    <Pressable
                      onPress={() => toggleArrayItem('busTypes', 'nonac')}
                      style={styles.optionRow}
                    >
                      <View style={styles.optionLeftWrap}>
                        <MaterialCommunityIcons name="fan-off" size={22} color="#334155" />
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          NONAC
                        </AppText>
                      </View>
                      <View style={styles.optionRightWrap}>
                        <AppText variant="caption" style={styles.countText}>
                          {stats.nonAcCount || 4}
                        </AppText>
                        <View style={[styles.checkboxBox, draftFilters.busTypes.includes('nonac') && styles.checkboxBoxChecked]}>
                          {draftFilters.busTypes.includes('nonac') && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* 2. Sort By Category */}
                {activeCategory === 'sort' && (
                  <View>
                    {[
                      { key: 'departure_asc', label: 'Departure: Early First' },
                      { key: 'departure_desc', label: 'Departure: Late First' },
                      { key: 'fare_asc', label: 'Price: Low to High' },
                      { key: 'fare_desc', label: 'Price: High to Low' },
                      { key: 'rating_desc', label: 'Ratings: High to Low' },
                      { key: 'duration_asc', label: 'Fastest Journey' },
                    ].map((opt) => (
                      <Pressable
                        key={opt.key}
                        onPress={() => setDraftFilters((p) => ({ ...p, sortBy: opt.key as any }))}
                        style={styles.optionRow}
                      >
                        <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                          {opt.label}
                        </AppText>
                        <Ionicons
                          name={draftFilters.sortBy === opt.key ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={draftFilters.sortBy === opt.key ? '#D92D20' : '#CBD5E1'}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 3. Departure Time Category */}
                {activeCategory === 'departure' && (
                  <View>
                    {[
                      { key: 'before_6am', label: 'Before 6 AM', sub: 'Early Morning', count: stats.before6am },
                      { key: '6am_12pm', label: '6 AM to 12 PM', sub: 'Morning', count: stats.between6and12 },
                      { key: '12pm_6pm', label: '12 PM to 6 PM', sub: 'Afternoon', count: stats.between12and18 },
                      { key: 'after_6pm', label: 'After 6 PM', sub: 'Night', count: stats.after18pm },
                    ].map((slot) => (
                      <Pressable
                        key={slot.key}
                        onPress={() => toggleArrayItem('departureTimeWindows', slot.key)}
                        style={styles.optionRow}
                      >
                        <View>
                          <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                            {slot.label}
                          </AppText>
                          <AppText variant="caption" style={{ color: '#64748B' }}>
                            {slot.sub}
                          </AppText>
                        </View>
                        <View style={styles.optionRightWrap}>
                          <AppText variant="caption" style={styles.countText}>
                            {slot.count}
                          </AppText>
                          <View style={[styles.checkboxBox, draftFilters.departureTimeWindows.includes(slot.key) && styles.checkboxBoxChecked]}>
                            {draftFilters.departureTimeWindows.includes(slot.key) && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 4. Single Window Category */}
                {activeCategory === 'singleWindow' && (
                  <View>
                    {[
                      { key: 'single', label: 'Single Seats', icon: 'person-outline' },
                      { key: 'window', label: 'Window Seats', icon: 'browsers-outline' },
                    ].map((opt) => (
                      <Pressable
                        key={opt.key}
                        onPress={() => toggleArrayItem('singleWindow', opt.key)}
                        style={styles.optionRow}
                      >
                        <View style={styles.optionLeftWrap}>
                          <Ionicons name={opt.icon as any} size={20} color="#334155" />
                          <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                            {opt.label}
                          </AppText>
                        </View>
                        <View style={[styles.checkboxBox, draftFilters.singleWindow.includes(opt.key) && styles.checkboxBoxChecked]}>
                          {draftFilters.singleWindow.includes(opt.key) && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 5. Boarding Points Category */}
                {activeCategory === 'boarding' && (
                  <View>
                    {stats.boardingPoints.map((bp) => (
                      <Pressable
                        key={bp.name}
                        onPress={() => toggleArrayItem('boardingPoints', bp.name)}
                        style={styles.optionRow}
                      >
                        <AppText variant="bodyMedium" numberOfLines={2} style={[styles.optionLabel, { flex: 1 }]}>
                          {bp.name}
                        </AppText>
                        <View style={styles.optionRightWrap}>
                          <AppText variant="caption" style={styles.countText}>
                            {bp.count}
                          </AppText>
                          <View style={[styles.checkboxBox, draftFilters.boardingPoints.includes(bp.name) && styles.checkboxBoxChecked]}>
                            {draftFilters.boardingPoints.includes(bp.name) && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 6. Dropping Points Category */}
                {activeCategory === 'dropping' && (
                  <View>
                    {stats.droppingPoints.map((dp) => (
                      <Pressable
                        key={dp.name}
                        onPress={() => toggleArrayItem('droppingPoints', dp.name)}
                        style={styles.optionRow}
                      >
                        <AppText variant="bodyMedium" numberOfLines={2} style={[styles.optionLabel, { flex: 1 }]}>
                          {dp.name}
                        </AppText>
                        <View style={styles.optionRightWrap}>
                          <AppText variant="caption" style={styles.countText}>
                            {dp.count}
                          </AppText>
                          <View style={[styles.checkboxBox, draftFilters.droppingPoints.includes(dp.name) && styles.checkboxBoxChecked]}>
                            {draftFilters.droppingPoints.includes(dp.name) && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 7. Operators Category */}
                {activeCategory === 'operator' && (
                  <View>
                    {stats.operators.map((op) => (
                      <Pressable
                        key={op.name}
                        onPress={() => toggleArrayItem('operators', op.name)}
                        style={styles.optionRow}
                      >
                        <AppText variant="bodyLargeBold" numberOfLines={1} style={[styles.optionLabel, { flex: 1 }]}>
                          {op.name}
                        </AppText>
                        <View style={styles.optionRightWrap}>
                          <AppText variant="caption" style={styles.countText}>
                            {op.count}
                          </AppText>
                          <View style={[styles.checkboxBox, draftFilters.operators.includes(op.name) && styles.checkboxBoxChecked]}>
                            {draftFilters.operators.includes(op.name) && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 8. Amenities Category */}
                {activeCategory === 'amenities' && (
                  <View>
                    {[
                      { key: 'toilet', label: 'Toilet', icon: 'water-outline' },
                      { key: 'wifi', label: 'WiFi', icon: 'wifi-outline' },
                      { key: 'charging', label: 'Charging Point', icon: 'battery-charging-outline' },
                      { key: 'water', label: 'Water Bottle', icon: 'beer-outline' },
                      { key: 'blanket', label: 'Blanket', icon: 'bed-outline' },
                    ].map((am) => (
                      <Pressable
                        key={am.key}
                        onPress={() => toggleArrayItem('amenities', am.key)}
                        style={styles.optionRow}
                      >
                        <View style={styles.optionLeftWrap}>
                          <Ionicons name={am.icon as any} size={20} color="#334155" />
                          <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                            {am.label}
                          </AppText>
                        </View>
                        <View style={[styles.checkboxBox, draftFilters.amenities.includes(am.key) && styles.checkboxBoxChecked]}>
                          {draftFilters.amenities.includes(am.key) && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* 9. Smart Filters & Features */}
                {(activeCategory === 'smart' || activeCategory === 'features') && (
                  <View>
                    {[
                      { key: 'primo', label: 'Primo Bus (On Time Guarantee)', icon: 'star' },
                      { key: 'women_choice', label: "Women's Choice Buses", icon: 'shield-checkmark' },
                      { key: 'new_bus', label: 'New Bus (< 1 year old)', icon: 'sparkles' },
                    ].map((feat) => (
                      <Pressable
                        key={feat.key}
                        onPress={() => toggleArrayItem('features', feat.key)}
                        style={styles.optionRow}
                      >
                        <View style={styles.optionLeftWrap}>
                          <Ionicons name={feat.icon as any} size={20} color="#D97706" />
                          <AppText variant="bodyLargeBold" style={styles.optionLabel}>
                            {feat.label}
                          </AppText>
                        </View>
                        <View style={[styles.checkboxBox, draftFilters.features.includes(feat.key) && styles.checkboxBoxChecked]}>
                          {draftFilters.features.includes(feat.key) && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          {/* Bottom Actions Footer matching ref-5 */}
          <View style={[styles.bottomFooterRow, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={handleClearAll}
              style={styles.clearAllButton}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <AppText variant="button" style={{ color: '#0F172A', fontWeight: '700' }}>
                Clear all
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleApply}
              style={styles.viewBusesButton}
              accessibilityRole="button"
              accessibilityLabel={`View ${matchingBusesCount} buses`}
            >
              <AppText variant="button" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                View {matchingBusesCount} buses
              </AppText>
            </Pressable>
          </View>
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
    height: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  bodyColumnsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftNavColumn: {
    width: 145,
    borderRightWidth: 1,
  },
  categoryTab: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
  },
  activeCategoryBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#D92D20',
  },
  categoryTabText: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryTabTextActive: {
    color: '#D92D20',
    fontWeight: '700',
  },
  rightContentColumn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  optionsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  optionLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  optionLabel: {
    marginLeft: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  optionRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    color: '#64748B',
    marginRight: 12,
    fontSize: 13,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#D92D20',
    borderColor: '#D92D20',
  },
  bottomFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  clearAllButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBusesButton: {
    flex: 1,
    marginLeft: 14,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: '#D92D20',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D92D20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
