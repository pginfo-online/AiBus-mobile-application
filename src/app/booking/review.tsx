import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  useCreateCheckoutSessionMutation,
} from '../../features/booking/useBookingMutations';
import { PaymentIntentResponse } from '../../features/payments/usePaymentMutations';
import { RazorpayService } from '../../features/payments/RazorpayService';
import { PaymentCoordinator } from '../../features/payments/PaymentCoordinator';
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
  const checkoutSessionMutation = useCreateCheckoutSessionMutation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);

  // Pre-loaded checkout session references for instantaneous gateway launch (< 50ms)
  const preloadedSessionRef = useRef<{
    bookingId: string;
    bookingNumber: string;
    paymentIntent: PaymentIntentResponse;
  } | null>(null);
  const preloadingPromiseRef = useRef<Promise<any> | null>(null);

  // Compute fares
  const totalFare = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.fare, 0), [selectedSeats]);
  const baseFare = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.baseFare, 0), [selectedSeats]);
  const taxes = useMemo(() => selectedSeats.reduce((sum, s) => sum + s.tax, 0), [selectedSeats]);

  // 1. Seat Hold Countdown Timer (RedBus / AbhiBus 10-minute hold standard)
  useEffect(() => {
    if (!activeHold?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setSecondsRemaining(remainingSecs);

      if (remainingSecs <= 0) {
        clearInterval(interval);
        Alert.alert(
          'Seat Hold Expired',
          'Your 10-minute seat hold time has expired. Please reselect your seats to ensure availability.',
          [
            {
              text: 'OK',
              onPress: () => {
                setActiveHold(null);
                setActiveBooking(null, null);
                router.navigate('/booking/seat-map' as any);
              },
            },
          ]
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold?.expiresAt, router, setActiveBooking, setActiveHold]);

  const formattedTimer = `${Math.floor(secondsRemaining / 60)}:${String(
    secondsRemaining % 60
  ).padStart(2, '0')}`;
  const isExpiringSoon = secondsRemaining > 0 && secondsRemaining < 90;

  // 2. Pre-fetch / Pre-create Seat Hold & Checkout Session in Background (Industry Standard Optimization)
  useEffect(() => {
    if (!selectedBoardingPoint || !selectedDroppingPoint || passengers.length === 0 || !selectedBus) {
      return;
    }

    let isMounted = true;

    const prepareCheckoutSession = async () => {
      try {
        // Step A: Acquire or verify valid seat hold
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
              customerName: contactName || passengers[0]?.name || 'Passenger',
              email: contactEmail || 'booking@aibus.in',
              phone: contactPhone || '9876543210',
              mobile: contactPhone || '9876543210',
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

          if (!isMounted) return;

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

        // Step B: Call consolidated checkout session endpoint
        const sessionRes = await checkoutSessionMutation.mutateAsync({
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
          contactName: contactName || passengers[0]?.name || 'Passenger',
          contactEmail: contactEmail || 'booking@aibus.in',
          contactPhone: contactPhone || '9876543210',
          passengers,
          cancellationPolicy: selectedBus.CancellationPolicy,
          gateway: 'RAZORPAY',
          paymentMode: 'UPI',
        });

        if (!isMounted) return;

        preloadedSessionRef.current = {
          bookingId: sessionRes.booking.id,
          bookingNumber: sessionRes.booking.bookingNumber,
          paymentIntent: sessionRes.paymentIntent,
        };

        setActiveBooking(sessionRes.booking.id, sessionRes.booking.bookingNumber);

        // Pre-store pending payment metadata for resilience
        await PendingPaymentStorage.set({
          bookingId: sessionRes.booking.id,
          merchantTxnId: sessionRes.paymentIntent.merchantTxnId,
          gatewayOrderId: sessionRes.paymentIntent.gatewayOrderId,
          amount: sessionRes.paymentIntent.amount,
          timestamp: Date.now(),
          gateway: 'RAZORPAY',
        });
      } catch (err) {
        // Safe fallback — on-demand initiation will run if pre-fetch fails
        console.warn('Background checkout session preparation fallback:', err);
      }
    };

    preloadingPromiseRef.current = prepareCheckoutSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmAndPay = async () => {
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

    if (secondsRemaining <= 10 && activeHold?.expiresAt) {
      Alert.alert('Hold Expired', 'Seat hold has expired. Please select your seats again.');
      router.navigate('/booking/seat-map' as any);
      return;
    }

    setIsSubmitting(true);

    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Safe fallback
      }

      // 2. Resolve Checkout Session (Instant if pre-loaded, or await in-flight promise)
      let session = preloadedSessionRef.current;

      if (!session && preloadingPromiseRef.current) {
        await preloadingPromiseRef.current;
        session = preloadedSessionRef.current;
      }

      // If still not ready, perform on-demand consolidated checkout session
      if (!session) {
        let holdId = activeHold?.id;
        let effectiveTotalFare = activeHold?.totalFare || totalFare;

        if (!holdId || (activeHold && new Date(activeHold.expiresAt).getTime() <= Date.now() + 30000)) {
          const holdRes = await holdMutation.mutateAsync({
            fromCityId: fromCity.providerCityId,
            toCityId: toCity.providerCityId,
            journeyDate,
            busId: selectedBus.RouteBusId || selectedBus.BusId,
            pickupId: selectedBoardingPoint.code,
            dropoffId: selectedDroppingPoint.code,
            contactInfo: {
              customerName: contactName || passengers[0]?.name || 'Passenger',
              email: contactEmail || 'booking@aibus.in',
              phone: contactPhone || '9876543210',
              mobile: contactPhone || '9876543210',
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

        const sessionRes = await checkoutSessionMutation.mutateAsync({
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
          contactName: contactName || passengers[0]?.name || 'Passenger',
          contactEmail: contactEmail || 'booking@aibus.in',
          contactPhone: contactPhone || '9876543210',
          passengers,
          cancellationPolicy: selectedBus.CancellationPolicy,
          gateway: 'RAZORPAY',
          paymentMode: 'UPI',
        });

        session = {
          bookingId: sessionRes.booking.id,
          bookingNumber: sessionRes.booking.bookingNumber,
          paymentIntent: sessionRes.paymentIntent,
        };

        preloadedSessionRef.current = session;
        setActiveBooking(sessionRes.booking.id, sessionRes.booking.bookingNumber);
      }

      const targetBookingId = session.bookingId;
      const targetIntent = session.paymentIntent;

      // Persist transaction state in storage
      await PendingPaymentStorage.set({
        bookingId: targetBookingId,
        merchantTxnId: targetIntent.merchantTxnId,
        gatewayOrderId: targetIntent.gatewayOrderId,
        amount: targetIntent.amount,
        timestamp: Date.now(),
        gateway: 'RAZORPAY',
      });

      // 3. Launch Razorpay Standard Checkout (< 50ms instant trigger)
      const checkoutResult = await RazorpayService.openCheckout(targetIntent);

      if (checkoutResult.status === 'SUCCESS' && checkoutResult.gatewayPaymentId) {
        await PendingPaymentStorage.set({
          bookingId: targetBookingId,
          merchantTxnId: checkoutResult.merchantTxnId,
          amount: targetIntent.amount,
          timestamp: Date.now(),
          gateway: 'RAZORPAY',
          gatewayOrderId: checkoutResult.gatewayOrderId,
          gatewayPaymentId: checkoutResult.gatewayPaymentId,
          gatewaySignature: checkoutResult.gatewaySignature,
        });

        // 4. Single-flight Navigation Guard: Prevents duplicate transitions & blank white screens
        if (PaymentCoordinator.claimNavigationLock()) {
          router.replace({
            pathname: '/booking/processing' as any,
            params: {
              bookingId: targetBookingId,
              merchantTxnId: targetIntent.merchantTxnId,
              gatewayOrderId: checkoutResult.gatewayOrderId || '',
              gatewayPaymentId: checkoutResult.gatewayPaymentId || '',
              gatewaySignature: checkoutResult.gatewaySignature || '',
              amount: String(targetIntent.amount),
            },
          });
        }
      } else if (checkoutResult.status === 'CANCELLED') {
        Alert.alert(
          'Payment Cancelled',
          'Your seat hold is still active for a few minutes. Tap Proceed to Pay whenever you are ready to retry.'
        );
      } else if (checkoutResult.status === 'FAILED') {
        Alert.alert(
          'Payment Failed',
          checkoutResult.errorDescription || 'Payment was declined by your bank. Please retry or use another payment method.'
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
          title={
            isSubmitting
              ? 'Opening Secure Payment...'
              : t('review.proceed_pay', { amount: totalFare.toFixed(2) })
          }
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
