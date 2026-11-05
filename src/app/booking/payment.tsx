import { PaymentCoordinator } from '../../features/payments/PaymentCoordinator';
import type { ThemeColors } from '../../design-system/tokens/colors';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  BackHandler,
  ActivityIndicator,
  Platform,
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
  useCreateCheckoutSessionMutation,
} from '../../features/booking/useBookingMutations';
import {
  PaymentGatewayType,
  PaymentModeType,
} from '../../features/payments/usePaymentMutations';
import { useOffersQuery, useValidateCouponMutation } from '../../features/offers';
import { RazorpayService } from '../../features/payments/RazorpayService';
import { PendingPaymentStorage } from '../../core/storage';
import { AppliedCoupon } from '../../types/api';

type PaymentMethodOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gateway: PaymentGatewayType;
  paymentMode: PaymentModeType;
  badge?: string;
  isPreferred?: boolean;
};

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'razorpay_upi',
    title: 'UPI (GPay / Paytm / CRED / BHIM)',
    subtitle: 'Google Pay, Paytm, BHIM, CRED UPI',
    icon: 'phone-portrait-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'UPI',
    badge: 'Popular',
  },
  {
    id: 'razorpay_cards',
    title: 'Credit / Debit Cards',
    subtitle: 'Visa, Mastercard, RuPay, Maestro',
    icon: 'card-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'CARD',
  },
  {
    id: 'razorpay_netbanking',
    title: 'Net Banking',
    subtitle: 'SBI, HDFC, ICICI, Axis & 50+ Banks',
    icon: 'business-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'NETBANKING',
  },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();

  const userId = useAuthStore((state) => state.user?.id);
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
    activeHold,
    appliedCoupon,
    setActiveBooking,
    applyCoupon,
    removeCoupon,
  } = useBookingStore();

  const { data: offers } = useOffersQuery('Bus');
  const recommendedCoupons = offers?.slice(0, 3).map((offer) => offer.code) ?? [];
  const validateCouponMutation = useValidateCouponMutation();
  const checkoutSessionMutation = useCreateCheckoutSessionMutation();

  const [selectedMethodId, setSelectedMethodId] = useState<string>('razorpay_upi');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const isInitiatingRef = useRef<boolean>(false);

  // Coupon input state
  const [couponInput, setCouponInput] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Modals state
  const [fareBreakupVisible, setFareBreakupVisible] = useState<boolean>(false);
  const [exitModalVisible, setExitModalVisible] = useState<boolean>(false);

  // Compute fares accurately
  const totalBaseFare = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.fare, 0),
    [selectedSeats]
  );
  const baseTicketFare = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.baseFare, 0),
    [selectedSeats]
  );
  const taxFare = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.tax, 0),
    [selectedSeats]
  );

  const totalFare = activeHold?.totalFare || totalBaseFare;

  // Coupon discount computation
  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Math.min(appliedCoupon.discountAmount, totalFare);
  }, [appliedCoupon, totalFare]);

  // Fare after coupon
  const fareAfterCoupon = Math.max(0, totalFare - couponDiscountAmount);

  const finalPayableAmount = Math.max(0, Math.round(fareAfterCoupon * 100) / 100);

  // Active Hold Countdown Timer (RedBus / AbhiBus standard)
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

  // Hardware Back Handler: Intercept with Exit-Intent Modal
  useEffect(() => {
    const onBackPress = () => {
      if (isProcessingPayment) return true;
      setExitModalVisible(true);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isProcessingPayment]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const rawCode = codeToApply || couponInput;
    if (isInitiatingRef.current) return;
    const cleanCode = rawCode.trim().toUpperCase();

    if (!cleanCode) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const res = await validateCouponMutation.mutateAsync({
        code: cleanCode,
        totalFare,
        busId: selectedBus?.RouteBusId || selectedBus?.BusId,
        operatorName: selectedBus?.CompanyName,
        fromCityId: fromCity.providerCityId,
        toCityId: toCity.providerCityId,
      });

      if (res.valid && res.coupon && Number(res.finalPayableAmount) >= 1) {
        applyCoupon({
          code: res.coupon.code,
          title: res.coupon.title,
          discountAmount: res.discountAmount,
          coupon: res.coupon,
        });
        setCouponInput('');
        setCouponError(null);

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        setCouponError(res.valid ? 'Razorpay requires a payable fare of at least ₹1.' : res.message || 'Invalid coupon code for this booking.');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Unable to validate coupon. Please try again.';
      setCouponError(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  };

  const handleRemoveCoupon = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    removeCoupon();
  };

  // Exit Modal Discount Application
  const handleExitModalApplyAndBook = async () => {
    setExitModalVisible(false);
    if (recommendedCoupons[0]) await handleApplyCoupon(recommendedCoupons[0]);
  };

  const handlePay = async () => {
    if (isInitiatingRef.current || isProcessingPayment || validateCouponMutation.isPending) return;

    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!activeHold || !selectedBus || !selectedBoardingPoint || !selectedDroppingPoint || !passengers.length ||
        new Date(activeHold.expiresAt).getTime() <= Date.now()) {
      Alert.alert('Hold Expired', 'Seat hold has expired. Please select your seats again.');
      router.navigate('/booking/seat-map' as any);
      return;
    }

    const selectedOption =
      PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0];

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    isInitiatingRef.current = true;
    setIsProcessingPayment(true);

    try {
      const sessionRes = await checkoutSessionMutation.mutateAsync({
        holdId: activeHold?.id,
        fromCityId: fromCity.providerCityId,
        toCityId: toCity.providerCityId,
        fromCityName: fromCity.name,
        toCityName: toCity.name,
        journeyDate,
        busId: selectedBus?.RouteBusId || selectedBus?.BusId,
        tripId: selectedBus?.TripId || 'TRIP-DEFAULT',
        pickupCode: selectedBoardingPoint?.code || '',
        pickupLocation: selectedBoardingPoint?.name || '',
        pickupTime: selectedBoardingPoint?.time || '',
        dropoffCode: selectedDroppingPoint?.code || '',
        dropoffLocation: selectedDroppingPoint?.name || '',
        dropoffTime: selectedDroppingPoint?.time || '',
        operatorName: selectedBus?.CompanyName || 'Bus Operator',
        busType: selectedBus?.BusTypeName || 'Express',
        totalFare,
        baseFare: baseTicketFare,
        serviceTax: taxFare,
        contactName: contactName || passengers[0]?.name || 'Passenger',
        contactEmail,
        contactPhone,
        passengers,
        cancellationPolicy: selectedBus?.CancellationPolicy,
        couponCode: appliedCoupon?.code,
        gateway: selectedOption.gateway,
        paymentMode: selectedOption.paymentMode,
      });

      const { booking, paymentIntent } = sessionRes;
      setActiveBooking(booking.id, booking.bookingNumber);
      if (!paymentIntent) {
        throw new Error('This booking does not have a Razorpay payment order.');
      }

      const pending = {
        userId,
        bookingId: booking.id,
        merchantTxnId: paymentIntent.merchantTxnId,
        gatewayOrderId: paymentIntent.gatewayOrderId,
        amount: paymentIntent.amount,
        timestamp: Date.now(),
        gateway: paymentIntent.gateway,
      };
      await PendingPaymentStorage.set(pending);
      const result = await RazorpayService.openCheckout(paymentIntent);
      if (PaymentCoordinator.isHandledByDeepLink()) return;

      if (result.status === 'SUCCESS' && result.gatewayPaymentId) {
        await PendingPaymentStorage.set({
          ...pending,
          gatewayOrderId: result.gatewayOrderId || pending.gatewayOrderId,
          gatewayPaymentId: result.gatewayPaymentId,
          gatewaySignature: result.gatewaySignature,
        });
        router.replace({
          pathname: '/booking/processing',
          params: { bookingId: booking.id, merchantTxnId: paymentIntent.merchantTxnId },
        });
      } else if (result.status === 'PENDING') {
        router.replace({
          pathname: '/booking/processing',
          params: { bookingId: booking.id, merchantTxnId: paymentIntent.merchantTxnId },
        });
      } else {
        Alert.alert(
          result.status === 'CANCELLED' ? 'Payment Cancelled' : 'Payment Could Not Be Completed',
          result.errorDescription || 'Check the booking status before trying to pay again.',
          [
            { text: 'Close', style: 'cancel' },
            {
              text: 'Check Status',
              onPress: () => router.replace({
                pathname: '/booking/processing',
                params: { bookingId: booking.id, merchantTxnId: paymentIntent.merchantTxnId },
              }),
            },
          ],
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Unable to initiate payment. Please check your connection and try again.';
      Alert.alert('Payment Initiation Failed', msg);
    } finally {
      isInitiatingRef.current = false;
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 1. Top Header matching ref-5 */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => setExitModalVisible(true)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '500' }}>
            To Pay
          </AppText>
          <AppText variant="heading2" style={{ color: colors.text, fontWeight: '800' }}>
            ₹{finalPayableAmount.toFixed(2)}
          </AppText>
        </View>

        <Pressable
          onPress={() => setFareBreakupVisible(true)}
          style={styles.fareBreakupLink}
          accessibilityRole="button"
          accessibilityLabel="View fare breakup"
        >
          <AppText variant="caption" style={styles.fareBreakupText}>
            Fare breakup
          </AppText>
          <Ionicons name="chevron-down" size={14} color="#0284C7" />
        </Pressable>
      </View>

      {/* 2. Seat Hold Urgency Timer matching ref-5 */}
      <View
        style={[
          styles.timerBar,
          {
            backgroundColor: isExpiringSoon ? colors.dangerSoft : colors.warningSoft,
            borderBottomColor: isExpiringSoon ? '#FCA5A5' : '#FDE68A',
          },
        ]}
      >
        <Ionicons
          name={isExpiringSoon ? 'alert-circle' : 'time-outline'}
          size={16}
          color={isExpiringSoon ? '#DC2626' : '#D97706'}
        />
        <AppText
          variant="bodySmallMedium"
          style={{
            marginLeft: 6,
            color: isExpiringSoon ? '#DC2626' : '#B45309',
            fontWeight: '600',
          }}
        >
          {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} blocked for you for{' '}
          <AppText variant="bodySmallMedium" style={{ fontWeight: '800' }}>
            {formattedTimer}
          </AppText>
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Trust Badges matching ref-5 */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={16} color="#059669" />
          <AppText variant="caption" style={styles.trustBannerText}>
            Secure Payment · Superfast Refunds · Trusted by 40Mn+ users
          </AppText>
        </View>

        {/* 4. Have a Coupon Code? Section matching ref-5 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pricetag" size={18} color="#D92D20" />
            <AppText variant="bodyLargeBold" style={{ marginLeft: 8, color: colors.text }}>
              Have a coupon code?
            </AppText>
          </View>

          {appliedCoupon ? (
            <View style={styles.appliedCouponBox}>
              <View style={styles.appliedCouponLeft}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <AppText variant="bodyMedium" style={{ color: '#065F46', fontWeight: '700' }}>
                    {appliedCoupon.code} applied!
                  </AppText>
                  <AppText variant="caption" style={{ color: '#047857' }}>
                    You saved ₹{couponDiscountAmount.toFixed(2)} on this booking
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={handleRemoveCoupon}
                hitSlop={8}
                style={styles.removeCouponButton}
                accessibilityRole="button"
                accessibilityLabel="Remove applied coupon"
              >
                <AppText variant="caption" style={{ color: '#DC2626', fontWeight: '700' }}>
                  Remove
                </AppText>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <View style={styles.couponInputRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={(val) => {
                    setCouponInput(val.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Enter code (e.g. BUS300)"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.couponTextInput}
                  returnKeyType="done"
                  onSubmitEditing={() => handleApplyCoupon()}
                />
                <Pressable
                  onPress={() => handleApplyCoupon()}
                  disabled={validateCouponMutation.isPending || !couponInput.trim()}
                  style={({ pressed }) => [
                    styles.applyButton,
                    {
                      backgroundColor: couponInput.trim() ? '#D92D20' : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Apply coupon code"
                >
                  {validateCouponMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AppText
                      variant="bodySmallMedium"
                      style={{
                        color: couponInput.trim() ? '#FFFFFF' : colors.textMuted,
                        fontWeight: '700',
                      }}
                    >
                      Apply
                    </AppText>
                  )}
                </Pressable>
              </View>

              {couponError && (
                <AppText variant="caption" style={styles.couponErrorText}>
                  {couponError}
                </AppText>
              )}

              {/* Recommended Quick Chips */}
              <View style={styles.quickChipsRow}>
                <AppText variant="caption" style={{ color: colors.textSecondary, marginRight: 6 }}>
                  Quick apply:
                </AppText>
                {recommendedCoupons.map((code) => (
                  <Pressable
                    key={code}
                    onPress={() => handleApplyCoupon(code)}
                    style={({ pressed }) => [
                      styles.quickChip,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <AppText variant="caption" style={styles.quickChipText}>
                      {code}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 6. Payment Methods matching ref-5 */}
        <View style={styles.sectionCard}>
          <AppText variant="heading3" style={{ color: colors.text, fontWeight: '800', marginBottom: 12 }}>
            Payment Options
          </AppText>

          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethodId === method.id;

            return (
              <Pressable
                key={method.id}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedMethodId(method.id);
                }}
                style={({ pressed }) => [
                  styles.methodRow,
                  isSelected && styles.methodRowSelected,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={[
                    styles.methodIconCircle,
                    { backgroundColor: isSelected ? colors.dangerSoft : colors.divider },
                  ]}
                >
                  <Ionicons
                    name={method.icon}
                    size={20}
                    color={isSelected ? '#DC2626' : '#475569'}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      {method.title}
                    </AppText>
                    {method.badge && (
                      <AppBadge
                        label={method.badge}
                        variant={method.isPreferred ? 'primary' : 'neutral'}
                        size="sm"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                  <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {method.subtitle}
                  </AppText>
                </View>

                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? '#D92D20' : '#CBD5E1'}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* 7. Bottom Sticky Pay Button matching ref-5 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPaySummary}>
          <AppText variant="caption" style={{ color: colors.textSecondary }}>
            Amount to Pay
          </AppText>
          <AppText variant="heading2" style={{ color: colors.text, fontWeight: '800' }}>
            ₹{finalPayableAmount.toFixed(2)}
          </AppText>
        </View>

        <Pressable
          onPress={handlePay}
          disabled={isProcessingPayment}
          style={({ pressed }) => [
            styles.payButton,
            { opacity: pressed || isProcessingPayment ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Pay rupees ${finalPayableAmount.toFixed(2)}`}
        >
          {isProcessingPayment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF', fontSize: 16 }}>
                {finalPayableAmount === 0
                  ? 'Confirm Booking (Free)'
                  : `Pay ₹${finalPayableAmount.toFixed(2)}`}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {/* 8. Fare Breakup Modal */}
      <Modal
        visible={fareBreakupVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFareBreakupVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFareBreakupVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <AppText variant="heading3" style={{ color: colors.text, fontWeight: '800' }}>
                Fare Breakup
              </AppText>
              <Pressable onPress={() => setFareBreakupVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.breakupList}>
              <View style={styles.breakupRow}>
                <AppText variant="bodyMedium" style={{ color: '#475569' }}>
                  Base Fare ({selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''})
                </AppText>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                  ₹{baseTicketFare.toFixed(2)}
                </AppText>
              </View>

              <View style={styles.breakupRow}>
                <AppText variant="bodyMedium" style={{ color: '#475569' }}>
                  Operator GST & Taxes
                </AppText>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                  ₹{taxFare.toFixed(2)}
                </AppText>
              </View>

              <View style={[styles.breakupRow, styles.breakupSubtotalRow]}>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  Gross Fare
                </AppText>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  ₹{totalFare.toFixed(2)}
                </AppText>
              </View>

              {appliedCoupon && (
                <View style={styles.breakupRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="pricetag" size={14} color="#059669" style={{ marginRight: 6 }} />
                    <AppText variant="bodyMedium" style={{ color: '#059669', fontWeight: '600' }}>
                      Coupon Discount ({appliedCoupon.code})
                    </AppText>
                  </View>
                  <AppText variant="bodyMedium" style={{ color: '#059669', fontWeight: '700' }}>
                    -₹{couponDiscountAmount.toFixed(2)}
                  </AppText>
                </View>
              )}



              <View style={styles.breakupDivider} />

              <View style={styles.breakupTotalRow}>
                <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                  Final Amount Payable
                </AppText>
                <AppText variant="heading2" style={{ color: '#D92D20', fontWeight: '800' }}>
                  ₹{finalPayableAmount.toFixed(2)}
                </AppText>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 9. Exit-Intent Retention Modal matching ref-6 */}
      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContent}>
            {/* Countdown Header */}
            <View style={styles.exitTimerBanner}>
              <Ionicons name="time-outline" size={16} color="#B45309" />
              <AppText variant="caption" style={styles.exitTimerText}>
                {selectedSeats.length} seat is blocked for you for {formattedTimer}
              </AppText>
            </View>

            {/* Gift Illustration Circle */}
            <View style={styles.giftIconCircle}>
              <Ionicons name="gift" size={36} color="#D92D20" />
            </View>

            {/* Headline matching ref-6 */}
            <AppText variant="heading2" style={styles.exitHeadline}>
              Keep your seat selection
            </AppText>

            <AppText variant="bodyLargeBold" style={styles.exitSubtitle}>
              Review your checkout before leaving
            </AppText>

            <AppText variant="caption" style={styles.exitDescription}>
              Your seats are held until the timer ends.
            </AppText>

            {recommendedCoupons.length > 0 && (
            <Pressable
              onPress={handleExitModalApplyAndBook}
              style={({ pressed }) => [
                styles.exitApplyButton,
                { opacity: pressed ? 0.9 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Apply coupon and book"
            >
              <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
                Apply coupon & book
              </AppText>
            </Pressable>
            )}

            {/* Action 2: Back to seat selection matching ref-6 */}
            <Pressable
              onPress={() => {
                setExitModalVisible(false);
                router.navigate('/booking/seat-map' as any);
              }}
              style={styles.exitBackButton}
              accessibilityRole="button"
              accessibilityLabel="Back to seat selection"
            >
              <AppText variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                Back to seat selection
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareBreakupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  fareBreakupText: {
    color: '#0284C7',
    fontWeight: '700',
    marginRight: 4,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  trustBannerText: {
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedCouponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  appliedCouponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  removeCouponButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.background,
  },
  applyButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponErrorText: {
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '500',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  quickChip: {
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quickChipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  walletToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletCheckbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletUsingBadge: {
    backgroundColor: '#CCFBF1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  methodRowSelected: {
    borderColor: '#D92D20',
    backgroundColor: '#FFF5F5',
  },
  methodIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPaySummary: {
    flex: 1,
  },
  payButton: {
    backgroundColor: '#D92D20',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  breakupList: {
    gap: 12,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakupSubtotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  breakupDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  breakupTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exitModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  exitTimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  exitTimerText: {
    color: '#92400E',
    fontWeight: '700',
    marginLeft: 6,
  },
  giftIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  exitHeadline: {
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  exitSubtitle: {
    color: '#D92D20',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  exitDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  exitApplyButton: {
    backgroundColor: '#D92D20',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  exitBackButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
});
