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
import * as WebBrowser from 'expo-web-browser';
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
  useCreateBookingMutation,
} from '../../features/booking/useBookingMutations';
import {
  useCreatePaymentIntentMutation,
  PaymentGatewayType,
  PaymentModeType,
} from '../../features/payments/usePaymentMutations';
import { useValidateCouponMutation } from '../../features/offers';
import { useWalletQuery } from '../../features/wallet/useWalletQuery';
import { RazorpayService } from '../../features/payments/RazorpayService';
import { PaymentCoordinator } from '../../features/payments/PaymentCoordinator';
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
    id: 'phonepe_upi',
    title: 'PhonePe UPI',
    subtitle: 'Pay directly using PhonePe UPI app',
    icon: 'flash-outline',
    gateway: 'PHONEPE',
    paymentMode: 'UPI',
    badge: 'Fastest',
    isPreferred: true,
  },
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

const RECOMMENDED_COUPONS = ['BUS300', 'PRIMODAY', 'AIBUS50'];

export default function PaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
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
    activeBookingNumber,
    appliedCoupon,
    useWallet,
    setActiveBooking,
    applyCoupon,
    removeCoupon,
    setUseWallet,
  } = useBookingStore();

  const { data: walletData } = useWalletQuery(isAuthenticated);
  const walletBalance = Number(walletData?.walletBalance || user?.walletBalance || 0);

  const validateCouponMutation = useValidateCouponMutation();
  const checkoutSessionMutation = useCreateCheckoutSessionMutation();
  const createBookingMutation = useCreateBookingMutation();
  const createIntentMutation = useCreatePaymentIntentMutation();

  const [selectedMethodId, setSelectedMethodId] = useState<string>('phonepe_upi');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
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

  // Wallet deduction computation
  const walletDeductionAmount = useMemo(() => {
    if (!useWallet || walletBalance <= 0) return 0;
    return Math.min(walletBalance, fareAfterCoupon);
  }, [useWallet, walletBalance, fareAfterCoupon]);

  // Final Payable Amount
  const finalPayableAmount = Math.max(0, Math.round((fareAfterCoupon - walletDeductionAmount) * 100) / 100);

  // Active Hold Countdown Timer (RedBus / AbhiBus standard)
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
              onPress: () => router.navigate('/booking/seat-map' as any),
            },
          ]
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold?.expiresAt, router]);

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

      if (res.valid && res.coupon) {
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
        setCouponError(res.message || 'Invalid coupon code for this booking.');
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
    // Apply AIBUS50
    await handleApplyCoupon('AIBUS50');
  };

  const handlePay = async () => {
    if (isInitiatingRef.current || isProcessingPayment) return;

    if (secondsRemaining <= 10) {
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
      // 1. Create or resolve consolidated checkout session with backend authoritative calculations
      let bookingId = activeBookingId;
      let bookingNumber = activeBookingNumber;
      let paymentIntent: any = null;

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
        contactEmail: contactEmail || 'booking@aibus.in',
        contactPhone: contactPhone || '9876543210',
        passengers,
        cancellationPolicy: selectedBus?.CancellationPolicy,
        couponCode: appliedCoupon?.code,
        useWallet,
        gateway: selectedOption.gateway,
        paymentMode: selectedOption.paymentMode,
      });

      bookingId = sessionRes.booking.id;
      bookingNumber = sessionRes.booking.bookingNumber;
      paymentIntent = sessionRes.paymentIntent;

      setActiveBooking(bookingId, bookingNumber);

      // Scenario A: Free booking (covered 100% by wallet/coupon)
      if (!paymentIntent || paymentIntent.amount === 0 || finalPayableAmount === 0) {
        if (PaymentCoordinator.claimNavigationLock()) {
          router.replace({
            pathname: '/booking/processing' as any,
            params: {
              bookingId,
              merchantTxnId: `TXN-FREE-${Date.now()}`,
              amount: '0',
              status: 'SUCCESS',
            },
          });
        }
        return;
      }

      // Scenario B: Gateway Payment Intent Persisted
      await PendingPaymentStorage.set({
        bookingId,
        merchantTxnId: paymentIntent.merchantTxnId,
        gatewayOrderId: paymentIntent.gatewayOrderId,
        amount: paymentIntent.amount,
        timestamp: Date.now(),
        gateway: paymentIntent.gateway,
      });

      // Scenario C: Launch Payment Gateway
      if (selectedOption.gateway === 'PHONEPE') {
        // PhonePe UPI / Web Flow
        if (paymentIntent.paymentUrl) {
          const authResult = await WebBrowser.openAuthSessionAsync(
            paymentIntent.paymentUrl,
            'aibus://payment-result'
          );

          if (PaymentCoordinator.claimNavigationLock()) {
            router.replace({
              pathname: '/booking/processing' as any,
              params: {
                bookingId,
                merchantTxnId: paymentIntent.merchantTxnId,
                amount: String(paymentIntent.amount),
                gateway: 'PHONEPE',
                status: authResult.type === 'cancel' || authResult.type === 'dismiss' ? 'PENDING' : 'SUCCESS',
              },
            });
          }
        }
      } else {
        // Razorpay SDK / Standard Checkout
        const checkoutResult = await RazorpayService.openCheckout(paymentIntent);

        if (checkoutResult.status === 'SUCCESS' && checkoutResult.gatewayPaymentId) {
          await PendingPaymentStorage.set({
            bookingId,
            merchantTxnId: checkoutResult.merchantTxnId,
            amount: paymentIntent.amount,
            timestamp: Date.now(),
            gateway: 'RAZORPAY',
            gatewayOrderId: checkoutResult.gatewayOrderId,
            gatewayPaymentId: checkoutResult.gatewayPaymentId,
            gatewaySignature: checkoutResult.gatewaySignature,
          });

          if (PaymentCoordinator.claimNavigationLock()) {
            router.replace({
              pathname: '/booking/processing' as any,
              params: {
                bookingId,
                merchantTxnId: checkoutResult.merchantTxnId,
                amount: String(paymentIntent.amount),
                gatewayOrderId: checkoutResult.gatewayOrderId || '',
                gatewayPaymentId: checkoutResult.gatewayPaymentId || '',
                gatewaySignature: checkoutResult.gatewaySignature || '',
              },
            });
          }
        } else if (checkoutResult.status === 'CANCELLED') {
          Alert.alert(
            'Payment Cancelled',
            'Your seat hold is still active for a few minutes. Tap Pay whenever you are ready.'
          );
        } else {
          Alert.alert(
            'Payment Failed',
            checkoutResult.errorDescription || 'Payment was declined. Please try another method.'
          );
        }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]} edges={['top', 'bottom']}>
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
          <AppText variant="caption" style={{ color: '#64748B', fontWeight: '500' }}>
            To Pay
          </AppText>
          <AppText variant="heading2" style={{ color: '#0F172A', fontWeight: '800' }}>
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
            backgroundColor: isExpiringSoon ? '#FEE2E2' : '#FEF3C7',
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
            <AppText variant="bodyLargeBold" style={{ marginLeft: 8, color: '#0F172A' }}>
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
                      backgroundColor: couponInput.trim() ? '#D92D20' : '#E2E8F0',
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
                        color: couponInput.trim() ? '#FFFFFF' : '#94A3B8',
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
                <AppText variant="caption" style={{ color: '#64748B', marginRight: 6 }}>
                  Quick apply:
                </AppText>
                {RECOMMENDED_COUPONS.map((code) => (
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

        {/* 5. AiBus Wallet Section matching ref-5 */}
        <View style={styles.sectionCard}>
          <Pressable
            onPress={() => {
              if (walletBalance > 0) {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setUseWallet(!useWallet);
              }
            }}
            style={styles.walletToggleRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: useWallet }}
          >
            <View style={styles.walletCheckbox}>
              <Ionicons
                name={useWallet ? 'checkbox' : 'square-outline'}
                size={22}
                color={useWallet ? '#0D9488' : '#94A3B8'}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                  AiBus Wallet
                </AppText>
                {walletBalance > 0 && (
                  <AppBadge
                    label={`₹${walletBalance.toFixed(2)}`}
                    variant="success"
                    size="sm"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
              <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
                {walletBalance > 0
                  ? `Available balance: ₹${walletBalance.toFixed(2)}`
                  : 'Zero balance · Cashbacks will be credited here'}
              </AppText>
            </View>

            {useWallet && walletDeductionAmount > 0 && (
              <View style={styles.walletUsingBadge}>
                <AppText variant="caption" style={{ color: '#0D9488', fontWeight: '700' }}>
                  Using ₹{walletDeductionAmount.toFixed(2)}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>

        {/* 6. Payment Methods matching ref-5 */}
        <View style={styles.sectionCard}>
          <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800', marginBottom: 12 }}>
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
                    { backgroundColor: isSelected ? '#FEE2E2' : '#F1F5F9' },
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
                    <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
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
                  <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
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
          <AppText variant="caption" style={{ color: '#64748B' }}>
            Amount to Pay
          </AppText>
          <AppText variant="heading2" style={{ color: '#0F172A', fontWeight: '800' }}>
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
              <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800' }}>
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
                <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '600' }}>
                  ₹{baseTicketFare.toFixed(2)}
                </AppText>
              </View>

              <View style={styles.breakupRow}>
                <AppText variant="bodyMedium" style={{ color: '#475569' }}>
                  Operator GST & Taxes
                </AppText>
                <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '600' }}>
                  ₹{taxFare.toFixed(2)}
                </AppText>
              </View>

              <View style={[styles.breakupRow, styles.breakupSubtotalRow]}>
                <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                  Gross Fare
                </AppText>
                <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
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

              {useWallet && walletDeductionAmount > 0 && (
                <View style={styles.breakupRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="wallet" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                    <AppText variant="bodyMedium" style={{ color: '#0D9488', fontWeight: '600' }}>
                      AiBus Wallet Applied
                    </AppText>
                  </View>
                  <AppText variant="bodyMedium" style={{ color: '#0D9488', fontWeight: '700' }}>
                    -₹{walletDeductionAmount.toFixed(2)}
                  </AppText>
                </View>
              )}

              <View style={styles.breakupDivider} />

              <View style={styles.breakupTotalRow}>
                <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
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
              Don't go back!
            </AppText>

            <AppText variant="bodyLargeBold" style={styles.exitSubtitle}>
              USE THIS COUPON TO GET UPTO 5% OFF
            </AppText>

            <AppText variant="caption" style={styles.exitDescription}>
              Apply code <AppText variant="caption" style={{ fontWeight: '800', color: '#D92D20' }}>AIBUS50</AppText> and complete your booking right now before seats are released.
            </AppText>

            {/* Action 1: Apply coupon & book matching ref-6 */}
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
              <AppText variant="bodyMedium" style={{ color: '#64748B', fontWeight: '600' }}>
                Back to seat selection
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quickChipText: {
    color: '#334155',
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
    borderColor: '#E2E8F0',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    backgroundColor: '#FFFFFF',
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
    borderTopColor: '#F1F5F9',
  },
  breakupDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FEF3C7',
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  exitHeadline: {
    color: '#0F172A',
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
    color: '#64748B',
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
