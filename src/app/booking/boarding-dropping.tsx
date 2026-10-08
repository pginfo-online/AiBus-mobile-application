import React, { useState } from 'react';
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
import {
  AppText,
  AppCard,
  AppButton,
  AppDivider,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore, BoardingDroppingPoint } from '../../stores/bookingStore';

export default function BoardingDroppingScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const {
    fromCity,
    toCity,
    selectedBus,
    selectedBoardingPoint,
    selectedDroppingPoint,
    setSelectedBoardingPoint,
    setSelectedDroppingPoint,
  } = useBookingStore();

  // Tab state: 'boarding' | 'dropping'
  const [activeTab, setActiveTab] = useState<'boarding' | 'dropping'>('boarding');

  const boardingList = selectedBus?.BoardingPoints || [];
  const droppingList = selectedBus?.DroppingPoints || [];

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
    // Smooth auto-transition to Dropping Points tab
    setActiveTab('dropping');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 1. Route Summary Card */}
      <View style={[styles.routeHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
          {fromCity.name} → {toCity.name}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
          {selectedBus?.CompanyName}
        </AppText>
      </View>

      {/* 2. Top Navigation Tabs (Boarding vs Dropping) */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceSecondary }]}>
        <Pressable
          onPress={() => setActiveTab('boarding')}
          style={[
            styles.tabButton,
            activeTab === 'boarding' && {
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              ...shadows.xs,
            },
          ]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={selectedBoardingPoint ? 'checkmark-circle' : 'radio-button-on'}
              size={18}
              color={selectedBoardingPoint ? colors.success : activeTab === 'boarding' ? colors.primary : colors.textMuted}
            />
            <View style={{ marginLeft: 6 }}>
              <AppText
                variant="bodySmallMedium"
                style={{
                  color: activeTab === 'boarding' ? colors.primary : colors.text,
                  fontWeight: activeTab === 'boarding' ? '700' : '500',
                }}
              >
                {t('points.boarding')}
              </AppText>
              {selectedBoardingPoint && (
                <AppText variant="caption" numberOfLines={1} style={{ color: colors.textSecondary, maxWidth: 110 }}>
                  {selectedBoardingPoint.name}
                </AppText>
              )}
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('dropping')}
          style={[
            styles.tabButton,
            activeTab === 'dropping' && {
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              ...shadows.xs,
            },
          ]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={selectedDroppingPoint ? 'checkmark-circle' : 'location'}
              size={18}
              color={selectedDroppingPoint ? colors.success : activeTab === 'dropping' ? colors.danger : colors.textMuted}
            />
            <View style={{ marginLeft: 6 }}>
              <AppText
                variant="bodySmallMedium"
                style={{
                  color: activeTab === 'dropping' ? colors.danger : colors.text,
                  fontWeight: activeTab === 'dropping' ? '700' : '500',
                }}
              >
                {t('points.dropping')}
              </AppText>
              {selectedDroppingPoint && (
                <AppText variant="caption" numberOfLines={1} style={{ color: colors.textSecondary, maxWidth: 110 }}>
                  {selectedDroppingPoint.name}
                </AppText>
              )}
            </View>
          </View>
        </Pressable>
      </View>

      {/* 3. Points List Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listScroll, { padding: spacing.base, paddingBottom: 100 }]}
      >
        {activeTab === 'boarding' ? (
          <View>
            <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.md }}>
              {t('points.select_boarding')}
            </AppText>

            {boardingList.map((item: any, idx: number) => {
              const isSelected = selectedBoardingPoint?.code === item.PickupCode;
              return (
                <Pressable
                  key={`bp-${item.PickupCode || idx}`}
                  onPress={() => handleSelectBoarding(item)}
                  style={({ pressed }) => [
                    styles.pointCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: radii.lg,
                      opacity: pressed ? 0.8 : 1,
                    },
                    isSelected ? shadows.sm : null,
                  ]}
                >
                  <View style={styles.pointTimeBox}>
                    <AppText variant="heading3" style={{ color: colors.text }}>
                      {item.PickupTime}
                    </AppText>
                  </View>

                  <View style={styles.pointDetailsBox}>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      {item.PickupName}
                    </AppText>
                    {item.Address && (
                      <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {item.Address}
                      </AppText>
                    )}
                    {item.Landmark && (
                      <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 1 }}>
                        Landmark: {item.Landmark}
                      </AppText>
                    )}
                  </View>

                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.primary : colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View>
            <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.md }}>
              {t('points.select_dropping')}
            </AppText>

            {droppingList.map((item: any, idx: number) => {
              const isSelected = selectedDroppingPoint?.code === item.DropoffCode;
              return (
                <Pressable
                  key={`dp-${item.DropoffCode || idx}`}
                  onPress={() => handleSelectDropping(item)}
                  style={({ pressed }) => [
                    styles.pointCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.danger : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: radii.lg,
                      opacity: pressed ? 0.8 : 1,
                    },
                    isSelected ? shadows.sm : null,
                  ]}
                >
                  <View style={styles.pointTimeBox}>
                    <AppText variant="heading3" style={{ color: colors.text }}>
                      {item.DropoffTime}
                    </AppText>
                  </View>

                  <View style={styles.pointDetailsBox}>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      {item.DropoffName}
                    </AppText>
                  </View>

                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.danger : colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 4. Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            ...shadows.lg,
          },
        ]}
      >
        <AppButton
          title={t('points.proceed_passengers')}
          onPress={handleProceed}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isComplete}
          icon={<Ionicons name="people" size={20} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  routeHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listScroll: {
    paddingTop: 8,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
  },
  pointTimeBox: {
    minWidth: 64,
  },
  pointDetailsBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
