import React, { useState } from 'react';
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
import {
  useHoldSeatsMutation,
  useCreateBookingMutation,
} from '../../features/booking/useBookingMutations';
import { useCreatePaymentIntentMutation } from '../../features/payments/usePaymentMutations';
import { RazorpayService } from '../../features/payments/RazorpayService';
import { PendingPaymentStorage } from '../../core/storage';
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
    activeBookingId,
    setActiveHold,
    setActiveBooking,
  } = useBookingStore();

  const holdMutation = useHoldSeatsMutation();
  const createBookingMutation = useCreateBookingMutation();
  const createPaymentIntentMutation = useCreatePaymentIntentMutation();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute fares
  const totalFare = selectedSeats.reduce((sum, s) => sum + s.fare, 0);
  const baseFare = selectedSeats.reduce((sum, s) => sum + s.baseFare, 0);
  const taxes = selectedSeats.reduce((sum, s) => sum + s.tax, 0);

  const handleConfirmAndPay = async () => {
    // 1. Enforce Authentication Before Payment (Requirement: Must be logged in)
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

    setIsSubmitting(true);

    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Safe fallback
      }

      // 2. Acquire or reuse valid Seat Hold from backend & upstream provider
      let holdId = activeHold?.id;
      let effectiveTotalFare = activeHold?.totalFare || totalFare;

      const isHoldValid =
        activeHold &&
        activeHold.id &&
        new Date(activeHold.expiresAt).getTime() > Date.now() + 30000;

      if (!isHoldValid) {
        const holdRes = await holdMutation.mutateAsync({
          fromCityId: fromCity.providerCityId,
          toCityId: toCity.providerCityId,
          journeyDate,
          busId: selectedBus.RouteBusId || selectedBus.BusId,
          pickupId: selectedBoardingPoint.code,
          dropoffId: selectedDroppingPoint.code,
          contactInfo: {
            customerName: contactName,
            email: contactEmail,
            phone: contactPhone,
            mobile: contactPhone,
          },
          gstDetails: gstin ? { gstin, gstCompany: gstCompany || '' } : undefined,
          passengers: passengers.map((p) => ({
            seatNo: p.seatNo,
            seatTypeId: p.seatTypeId,
            fare: p.fare,
            gender: p.gender,
            age: p.age,
            name: p.name,
            isAcSeat: p.isAcSeat,
          })),
        });

        holdId = holdRes.id;
        effectiveTotalFare = holdRes.totalFare || totalFare;

        setActiveHold({
          id: holdRes.id,
          providerHoldId: holdRes.providerHoldId,
          expiresAt: holdRes.expiresAt,
          ttlSeconds: holdRes.ttlSeconds || 600,
          totalFare: holdRes.totalFare || totalFare,
        });
      }

      // 3. Create or reuse Booking record
      let targetBookingId = activeBookingId;
      if (!targetBookingId) {
        const bookingRes = await createBookingMutation.mutateAsync({
          holdId: holdId || undefined,
          fromCityId: fromCity.providerCityId,
          toCityId: toCity.providerCityId,
          fromCityName: fromCity.name,
          toCityName: toCity.name,
          journeyDate,
          busId: selectedBus.RouteBusId || selectedBus.BusId,
          tripId: selectedBus.TripId || 'TRIP-DEFAULT',
          pickupCode: selectedBoardingPoint.code,
          pickupLocation: selectedBoardingPoint.name,
          pickupTime: selectedBoardingPoint.time,
          dropoffCode: selectedDroppingPoint.code,
          dropoffLocation: selectedDroppingPoint.name,
          dropoffTime: selectedDroppingPoint.time,
          operatorName: selectedBus.CompanyName,
          busType: selectedBus.BusTypeName,
          totalFare: effectiveTotalFare,
          baseFare,
          serviceTax: taxes,
          contactName,
          contactEmail,
          contactPhone,
          passengers,
          cancellationPolicy: selectedBus.CancellationPolicy,
        });

        targetBookingId = bookingRes.id;
        setActiveBooking(bookingRes.id, bookingRes.bookingNumber);
      }

      // 4. Directly initiate Razorpay payment (no intermediate screen)
      const intentRes = await createPaymentIntentMutation.mutateAsync({
        bookingId: targetBookingId,
        gateway: 'RAZORPAY',
      });

      // Persist pending payment state for recovery
      await PendingPaymentStorage.set({
        bookingId: targetBookingId,
        merchantTxnId: intentRes.merchantTxnId,
        gatewayOrderId: intentRes.gatewayOrderId,
        amount: intentRes.amount,
        timestamp: Date.now(),
        gateway: 'RAZORPAY',
      });

      // 5. Launch official Razorpay Checkout sheet directly
      const checkoutResult = await RazorpayService.openCheckout(intentRes);

      if (checkoutResult.status === 'SUCCESS' && checkoutResult.gatewayPaymentId) {
        await PendingPaymentStorage.set({
          bookingId: targetBookingId,
          merchantTxnId: checkoutResult.merchantTxnId,
          amount: intentRes.amount,
          timestamp: Date.now(),
          gateway: 'RAZORPAY',
          gatewayOrderId: checkoutResult.gatewayOrderId,
          gatewayPaymentId: checkoutResult.gatewayPaymentId,
          gatewaySignature: checkoutResult.gatewaySignature,
        });

        router.push({
          pathname: '/booking/processing' as any,
          params: {
            bookingId: targetBookingId,
            merchantTxnId: intentRes.merchantTxnId,
            gatewayOrderId: checkoutResult.gatewayOrderId || '',
            gatewayPaymentId: checkoutResult.gatewayPaymentId || '',
            gatewaySignature: checkoutResult.gatewaySignature || '',
            amount: String(intentRes.amount),
          },
        });
      } else if (checkoutResult.status === 'CANCELLED') {
        Alert.alert(
          'Payment Cancelled',
          'Your seat hold is still active for a few minutes. Tap Proceed to Pay whenever you are ready to retry.'
        );
      } else if (checkoutResult.status === 'FAILED') {
        Alert.alert(
          'Payment Failed',
          checkoutResult.errorDescription || 'Payment was declined by your bank. Please retry or use another UPI app.'
        );
      }
    } catch (err: any) {
      const errorMsg =
        err instanceof DomainError
          ? err.message
          : err?.response?.data?.error?.message || err?.message || 'Failed to process booking. Please try again.';

      Alert.alert('Unable to Proceed', errorMsg, [
        {
          text: 'Retry',
          onPress: () => handleConfirmAndPay(),
        },
        {
          text: 'Choose Other Seats',
          onPress: () => {
            setActiveHold(null);
            setActiveBooking(null, null);
            router.navigate('/booking/seat-map' as any);
          },
          style: 'cancel',
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 110 }]}
      >
        {/* 1. Bus Summary Card */}
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
            <AppBadge label="Seats Held" variant="warning" />
          </View>

          <AppDivider spacingMargin="sm" />

          {/* Boarding & Dropping Points Timeline */}
          <View style={styles.timelineRow}>
            <View style={styles.timelinePoint}>
              <Ionicons name="radio-button-on" size={18} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
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
              <View style={{ marginLeft: 8 }}>
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

        {/* 2. Passengers Summary */}
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

        {/* 3. Contact Details Card */}
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

        {/* 4. Fare Breakdown Card */}
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
      </ScrollView>

      {/* 5. Bottom Confirm & Pay Action */}
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
          loading={isSubmitting}
          icon={<Ionicons name="lock-closed" size={18} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
