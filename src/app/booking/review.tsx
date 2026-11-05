import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
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
  AppBadge,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore } from '../../stores/bookingStore';
import { useAuthStore } from '../../stores/authStore';
import { DomainError } from '../../core/errors';

export default function ReviewBookingScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    fromCity,
    toCity,
    journeyDate,
    selectedBus,
    selectedSeats,
    selectedBoardingPoint,
    selectedDroppingPoint,
    passengers,
    contactName,
    contactEmail,
    contactPhone,
    gstin,
    gstCompany,
    activeHold,
    setActiveHold,
    setActiveBooking,
  } = useBookingStore();


  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);

  // Compute fares
  const totalFare = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.fare, 0), [selectedSeats]);
  const baseFare = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.baseFare, 0), [selectedSeats]);
  const taxes = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.tax, 0), [selectedSeats]);

  // 1. Seat Hold Countdown Timer (RedBus / AbhiBus 10-minute hold standard)
  useEffect(() => {
    if (!activeHold?.expiresAt) return;

    const update = () => setSecondsRemaining(Math.max(
      0, Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000)
    ));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeHold?.expiresAt]);

  const formattedTimer = `${Math.floor(secondsRemaining / 60)}:${String(
    secondsRemaining % 60
  ).padStart(2, '0')}`;
  const isExpiringSoon = secondsRemaining > 0 && secondsRemaining < 90;

  const handleConfirmAndPay = () => {
    // 1. Enforce Authentication Before Payment
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please sign in or create an account to proceed with your booking and secure your tickets.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log In',
            onPress: () => router.push('/(auth)/login' as any),
          },
        ]
      );
      return;
    }

    if (!selectedBoardingPoint || !selectedDroppingPoint) {
      Alert.alert('Missing Information', 'Boarding or Dropping point is missing.');
      return;
    }

    if (!activeHold || new Date(activeHold.expiresAt).getTime() <= Date.now()) {
      Alert.alert('Hold Expired', 'Seat hold has expired. Please select your seats again.');
      router.navigate('/booking/seat-map' as any);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/booking/payment');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 1. Timer Banner with Urgency Warning */}
      {activeHold?.expiresAt && (
        <View
          style={[
            styles.timerBanner,
            {
              backgroundColor: isExpiringSoon ? colors.dangerSoft : colors.warningSoft,
              borderBottomColor: isExpiringSoon ? colors.dangerBorder : colors.warningBorder,
            },
          ]}
        >
          <Ionicons
            name={isExpiringSoon ? 'alert-circle' : 'time-outline'}
            size={18}
            color={isExpiringSoon ? colors.danger : colors.warning}
          />
          <AppText
            variant="bodySmallMedium"
            style={{
              color: isExpiringSoon ? colors.danger : colors.warning,
              marginLeft: 6,
            }}
          >
            Seats held for:{' '}
            <AppText
              variant="bodySmallMedium"
              style={{
                fontWeight: '700',
                color: isExpiringSoon ? colors.danger : colors.warning,
              }}
            >
              {formattedTimer}
            </AppText>
            {isExpiringSoon && ' (Expiring soon!)'}
          </AppText>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 110 }]}
      >
        {/* 2. Bus Summary Card */}
        <AppCard variant="elevated" padding="base" style={[styles.card, shadows.sm]}>
          <View style={styles.busHeaderRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading3" style={{ color: colors.text }}>
                {selectedBus?.CompanyName}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                {selectedBus?.BusTypeName}
              </AppText>
            </View>
            <AppBadge label="Seats Held" variant="success" />
          </View>

          <AppDivider spacingMargin="sm" />

          {/* Boarding & Dropping Points Timeline */}
          <View style={styles.timelineRow}>
            <View style={styles.timelinePoint}>
              <Ionicons name="radio-button-on" size={18} color={colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                  {selectedBoardingPoint?.time}
                </AppText>
                <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {selectedBoardingPoint?.name} ({fromCity.name})
                </AppText>
              </View>
            </View>

            <View style={[styles.timelinePoint, { marginTop: spacing.md }]}>
              <Ionicons name="location" size={18} color={colors.danger} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                  {selectedDroppingPoint?.time}
                </AppText>
                <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {selectedDroppingPoint?.name} ({toCity.name})
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        {/* 3. Passengers Summary */}
        <AppCard variant="elevated" padding="base" style={[styles.card, shadows.sm]}>
          <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.sm }}>
            Passengers ({passengers.length})
          </AppText>
          {passengers.map((p, idx) => (
            <View key={`review-p-${idx}`} style={styles.passengerRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                  {p.name}
                </AppText>
                <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 1 }}>
                  {p.gender === 'M' ? 'Male' : 'Female'}, {p.age} Yrs • Seat {p.seatNo}
                </AppText>
              </View>
              <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                ₹{p.fare}
              </AppText>
            </View>
          ))}
        </AppCard>

        {/* 4. Contact Details Card */}
        <AppCard variant="elevated" padding="base" style={[styles.card, shadows.sm]}>
          <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.xs }}>
            Contact Details
          </AppText>
          <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
            {contactEmail} • {contactPhone}
          </AppText>
          {gstin && (
            <AppText variant="caption" style={{ color: colors.primary, marginTop: 4, fontWeight: '600' }}>
              GSTIN: {gstin} ({gstCompany})
            </AppText>
          )}
        </AppCard>

        {/* 5. Fare Breakdown Card */}
        <AppCard variant="elevated" padding="base" style={[styles.card, shadows.sm]}>
          <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.sm }}>
            {t('review.fare_breakdown')}
          </AppText>

          <View style={styles.fareRow}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              {t('review.base_fare')}
            </AppText>
            <AppText variant="bodyMedium" style={{ color: colors.text }}>
              ₹{baseFare.toFixed(2)}
            </AppText>
          </View>

          <View style={styles.fareRow}>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              {t('review.taxes')}
            </AppText>
            <AppText variant="bodyMedium" style={{ color: colors.text }}>
              ₹{taxes.toFixed(2)}
            </AppText>
          </View>

          <AppDivider spacingMargin="sm" />

          <View style={styles.fareRow}>
            <AppText variant="heading3" style={{ color: colors.text }}>
              {t('review.total_payable')}
            </AppText>
            <AppText variant="priceLarge" style={{ color: colors.primary }}>
              ₹{totalFare.toFixed(2)}
            </AppText>
          </View>
        </AppCard>

        {/* Trust Badges */}
        <View style={styles.trustBadgeContainer}>
          <View style={styles.trustBadgeRow}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
              {t('payment.secure_badge') || '100% Safe & Secure Payment with Razorpay'}
            </AppText>
          </View>
          <AppText
            variant="caption"
            style={{ color: colors.textMuted, textAlign: 'center', marginTop: 4 }}
          >
            Instant refund to source if seat cannot be confirmed by operator
          </AppText>
        </View>
      </ScrollView>

      {/* 6. Bottom Confirm & Pay Action */}
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
        <AppButton
          title={t('review.proceed_pay', { amount: totalFare.toFixed(2) })}
          onPress={handleConfirmAndPay}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    width: '100%',
  },
  busHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineRow: {
    paddingVertical: 4,
  },
  timelinePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  trustBadgeContainer: {
    marginTop: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
