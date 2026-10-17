import React, { useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../theme';
import { AppText } from './AppText';

interface AppDateSelectorModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onClose: () => void;
  minDate?: string; // default today
  maxDaysAhead?: number; // default 90 days
}

interface MonthData {
  year: number;
  month: number; // 0-indexed
  name: string;
  weeks: Array<Array<{
    dayNumber: number | null;
    dateString: string | null;
    isPast: boolean;
    isToday: boolean;
    isSelected: boolean;
    isWeekend: boolean;
    isBeyondMax: boolean;
  }>>;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AppDateSelectorModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  minDate,
  maxDaysAhead = 90,
}: AppDateSelectorModalProps) {
  const { colors, radii, shadows } = useAppTheme();

  // Reference today string
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const effectiveMinDate = minDate || todayStr;

  // Maximum selectable date
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxDaysAhead);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [maxDaysAhead]);

  // Generate 3 months of calendar data
  const monthsData = useMemo<MonthData[]>(() => {
    const result: MonthData[] = [];
    const baseDate = new Date();

    for (let offset = 0; offset < 3; offset++) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthName = current.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // getDay() gives 0 for Sunday, 1 for Monday, etc.
      // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
      let firstDayIndex = current.getDay() - 1;
      if (firstDayIndex === -1) firstDayIndex = 6;

      const weeks: MonthData['weeks'] = [];
      let currentWeek: MonthData['weeks'][0] = [];

      // Fill empty slots before first day
      for (let i = 0; i < firstDayIndex; i++) {
        currentWeek.push({
          dayNumber: null,
          dateString: null,
          isPast: false,
          isToday: false,
          isSelected: false,
          isWeekend: false,
          isBeyondMax: false,
        });
      }

      // Fill days of the month
      for (let d = 1; d <= daysInMonth; d++) {
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        const dateString = `${year}-${mStr}-${dStr}`;

        const isPast = dateString < effectiveMinDate;
        const isToday = dateString === todayStr;
        const isSelected = dateString === selectedDate;
        const dayOfWeek = (firstDayIndex + d - 1) % 7;
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Sat or Sun
        const isBeyondMax = dateString > maxDateStr;

        currentWeek.push({
          dayNumber: d,
          dateString,
          isPast,
          isToday,
          isSelected,
          isWeekend,
          isBeyondMax,
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // Fill remaining empty slots in last week
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            dayNumber: null,
            dateString: null,
            isPast: false,
            isToday: false,
            isSelected: false,
            isWeekend: false,
            isBeyondMax: false,
          });
        }
        weeks.push(currentWeek);
      }

      result.push({
        year,
        month,
        name: monthName,
        weeks,
      });
    }

    return result;
  }, [effectiveMinDate, maxDateStr, selectedDate, todayStr]);

  const handleDayPress = (dateStr: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    onSelectDate(dateStr);
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
          {/* Header matching ref-9: "Select Date" with 'X' button */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <AppText variant="heading2" style={[styles.title, { color: colors.text }]}>
              Select Date
            </AppText>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close date selector"
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday Strip: Mon Tue Wed Thu Fri Sat Sun */}
          <View style={[styles.weekdayRow, { borderBottomColor: colors.divider }]}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <AppText
                  variant="caption"
                  style={[
                    styles.weekdayText,
                    {
                      color: day === 'Sat' || day === 'Sun' ? colors.pillCoralText : colors.textSecondary,
                    },
                  ]}
                >
                  {day}
                </AppText>
              </View>
            ))}
          </View>

          {/* Months Scroll List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.calendarScroll}
          >
            {monthsData.map((m) => (
              <View key={`${m.year}-${m.month}`} style={styles.monthSection}>
                <AppText variant="bodyLargeBold" style={[styles.monthHeading, { color: colors.text }]}>
                  {m.name}
                </AppText>

                <View style={styles.weeksContainer}>
                  {m.weeks.map((week, wIdx) => (
                    <View key={`week-${wIdx}`} style={styles.weekRow}>
                      {week.map((day, dIdx) => {
                        if (!day.dayNumber || !day.dateString) {
                          return <View key={`empty-${dIdx}`} style={styles.dayCell} />;
                        }

                        const isDisabled = day.isPast || day.isBeyondMax;

                        return (
                          <Pressable
                            key={day.dateString}
                            disabled={isDisabled}
                            onPress={() => handleDayPress(day.dateString!)}
                            style={styles.dayCell}
                            accessibilityRole="button"
                            accessibilityState={{ selected: day.isSelected, disabled: isDisabled }}
                            accessibilityLabel={`${day.dayNumber} ${m.name}`}
                          >
                            <View
                              style={[
                                styles.dayCircle,
                                day.isSelected && [
                                  styles.selectedCircle,
                                  { backgroundColor: '#1E293B' },
                                ],
                                day.isToday && !day.isSelected && [
                                  styles.todayCircle,
                                  { borderColor: colors.primary },
                                ],
                              ]}
                            >
                              <AppText
                                variant="bodyMedium"
                                style={[
                                  styles.dayText,
                                  {
                                    color: day.isSelected
                                      ? '#EF4444' // Selected date has red day number on dark circle as shown in ref-9
                                      : day.isToday
                                      ? colors.primary // Today has red day number
                                      : day.isWeekend
                                      ? colors.pillCoralText // Weekends are red
                                      : colors.text,
                                    fontWeight: day.isSelected || day.isToday ? '700' : '500',
                                  },
                                  isDisabled ? styles.disabledText : null,
                                ]}
                              >
                                {day.dayNumber}
                              </AppText>

                              {/* Strike-through line for past / disabled dates matching ref-9 */}
                              {day.isPast && <View style={styles.strikethrough} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

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
    maxHeight: '85%',
    minHeight: 520,
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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  calendarScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  monthSection: {
    marginBottom: 28,
  },
  monthHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  weeksContainer: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedCircle: {
    backgroundColor: '#1E293B',
  },
  todayCircle: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 15,
  },
  disabledText: {
    color: '#94A3B8',
  },
  strikethrough: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 18,
    height: 1,
    backgroundColor: '#94A3B8',
  },
});
