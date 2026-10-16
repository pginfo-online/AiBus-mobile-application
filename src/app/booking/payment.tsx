import React, { useState, useEffect, useRef } from 'react';
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
import {
  useCreatePaymentIntentMutation,
  PaymentGatewayType,
  PaymentModeType,
} from '../../features/payments/usePaymentMutations';
import { RazorpayService } from '../../features/payments/RazorpayService';
import { PendingPaymentStorage } from '../../core/storage';

type PaymentMethodOption = {
  id: string;
  titleKey: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gateway: PaymentGatewayType;
  paymentMode: PaymentModeType;
  isRecommended?: boolean;
};

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'razorpay_upi',
    titleKey: 'payment.razorpay_upi',
    subtitle: 'Google Pay, PhonePe, Paytm, CRED, BHIM',
    icon: 'phone-portrait-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'UPI',
    isRecommended: true,
  },
  {
    id: 'razorpay_cards',
    titleKey: 'payment.cards',
    subtitle: 'Visa, Mastercard, RuPay, Maestro',
    icon: 'card-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'CARD',
  },
  {
    id: 'razorpay_netbanking',
    titleKey: 'payment.netbanking',
    subtitle: 'SBI, HDFC, ICICI, Axis & 50+ Banks',
    icon: 'business-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'NETBANKING',
  },
  {
    id: 'razorpay_wallets',
    titleKey: 'payment.wallets',
    subtitle: 'Paytm Wallet, Mobikwik, PhonePe',
    icon: 'wallet-outline',
    gateway: 'RAZORPAY',
    paymentMode: 'WALLET',
  },
  {
    id: 'phonepe_gateway',
    titleKey: 'payment.phonepe_upi',
    subtitle: 'PhonePe UPI & Standard Checkout',
    icon: 'flash-outline',
    gateway: 'PHONEPE',
    paymentMode: 'ALL',
  },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const {
    activeHold,
    activeBookingId,
    activeBookingNumber,
    selectedSeats,
  } = useBookingStore();

  const [selectedMethodId, setSelectedMethodId] = useState<string>('razorpay_upi');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const isInitiatingRef = useRef<boolean>(false);

  const createIntentMutation = useCreatePaymentIntentMutation();

  // Active Seat Hold Countdown Timer with 90s cutoff warning (RedBus / AbhiBus standard)
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

  const amount = activeHold?.totalFare || 0;
  const isExpiringSoon = secondsRemaining > 0 && secondsRemaining < 90;

  const handlePay = async () => {
    if (isInitiatingRef.current || isProcessingPayment) return;
    if (!activeBookingId) {
      Alert.alert('Error', 'No active booking session found. Please start from search.');
      return;
    }

    if (secondsRemaining <= 10) {
      Alert.alert('Hold Expiring', 'Seat hold has expired. Please select your seats again.');
      router.navigate('/booking/seat-map' as any);
      return;
    }

    const selectedOption =
      PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0];

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }

    isInitiatingRef.current = true;
    setIsProcessingPayment(true);

    try {
      // 1. Create real payment intent on backend
      const intentRes = await createIntentMutation.mutateAsync({
        bookingId: activeBookingId,
        gateway: selectedOption.gateway,
        paymentMode: selectedOption.paymentMode,
      });

      // 2. Persist transaction metadata to secure storage (process death & crash recovery)
      await PendingPaymentStorage.set({
        bookingId: activeBookingId,
        merchantTxnId: intentRes.merchantTxnId,
        amount: intentRes.amount,
        timestamp: Date.now(),
        gateway: intentRes.gateway,
        gatewayOrderId: intentRes.gatewayOrderId,
      });

      // 3. Gateway Processing based on resolved gateway
      if (intentRes.gateway === 'RAZORPAY') {
        // Official Razorpay Checkout Flow (Live Credentials)
        const checkoutResult = await RazorpayService.openCheckout(intentRes);

        if (checkoutResult.status === 'SUCCESS' && checkoutResult.gatewayPaymentId) {
          // Update storage with verified credentials
          await PendingPaymentStorage.set({
            bookingId: activeBookingId,
            merchantTxnId: checkoutResult.merchantTxnId,
            amount: intentRes.amount,
            timestamp: Date.now(),
            gateway: 'RAZORPAY',
            gatewayOrderId: checkoutResult.gatewayOrderId,
            gatewayPaymentId: checkoutResult.gatewayPaymentId,
            gatewaySignature: checkoutResult.gatewaySignature,
          });

          // Navigate directly to server-side verification screen
          router.push({
            pathname: '/booking/processing' as any,
            params: {
              bookingId: activeBookingId,
              merchantTxnId: checkoutResult.merchantTxnId,
              amount: String(intentRes.amount),
              gatewayOrderId: checkoutResult.gatewayOrderId || '',
              gatewayPaymentId: checkoutResult.gatewayPaymentId || '',
              gatewaySignature: checkoutResult.gatewaySignature || '',
            },
          });
        } else if (checkoutResult.status === 'CANCELLED') {
          Alert.alert(
            'Payment Incomplete',
            t('payment.cancelled'),
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Payment Failed',
            checkoutResult.errorDescription || t('payment.failed'),
            [{ text: 'Try Again' }]
          );
        }
      } else {
        // PhonePe Gateway Flow
        if (intentRes.paymentUrl) {
          try {
            await WebBrowser.openAuthSessionAsync(
              intentRes.paymentUrl,
              'aibus://payment-result'
            );
          } catch {
            await WebBrowser.openBrowserAsync(intentRes.paymentUrl).catch(() => {});
          }
        }

        // Navigate to processing screen to poll/verify PhonePe status
        router.push({
          pathname: '/booking/processing' as any,
          params: {
            bookingId: activeBookingId,
            merchantTxnId: intentRes.merchantTxnId,
            amount: String(intentRes.amount),
          },
        });
      }
    } catch (err: any) {
      Alert.alert(
        'Payment Initiation Failed',
        err.message || 'Unable to connect to payment gateway. Please check your network and try again.'
      );
    } finally {
      isInitiatingRef.current = false;
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 1. Timer Banner with Urgency Warning */}
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
          {t('payment.timer')}:{' '}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 110 }]}
      >
        {/* 2. Amount Summary Card */}
        <AppCard variant="elevated" padding="base" style={[styles.amountCard, shadows.sm]}>
          <View style={styles.amountHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Total Payable Amount
              </AppText>
              <AppText variant="priceLarge" style={{ color: colors.primary, marginTop: 2 }}>
                ₹{amount.toFixed(2)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppBadge label="Seats Held" variant="success" />
              <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
                {selectedSeats?.length || 1} Seat{(selectedSeats?.length || 1) > 1 ? 's' : ''} ({selectedSeats?.map((s) => s.seatNo).join(', ')})
              </AppText>
            </View>
          </View>

          <AppDivider spacingMargin="sm" />

          <View style={styles.bookingRefRow}>
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              Booking Reference:
            </AppText>
            <AppText variant="caption" style={{ fontWeight: '600', color: colors.text }}>
              {activeBookingNumber || 'Generating...'}
            </AppText>
          </View>
        </AppCard>

        {/* 3. Payment Methods */}
        <View style={styles.sectionTitleRow}>
          <AppText variant="heading3" style={{ color: colors.text }}>
            {t('payment.title')}
          </AppText>
          <View style={styles.liveBadgeRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <AppText variant="caption" style={{ color: colors.success, fontWeight: '600', marginLeft: 4 }}>
              Razorpay Live Secured
            </AppText>
          </View>
        </View>

        {/* Payment Options List */}
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethodId === method.id;
          return (
            <Pressable
              key={method.id}
              onPress={() => {
                setSelectedMethodId(method.id);
                try {
                  Haptics.selectionAsync();
                } catch {
                  // Safe fallback
                }
              }}
              style={({ pressed }) => [
                styles.gatewayCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  borderRadius: radii.lg,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: spacing.sm,
                },
                isSelected ? shadows.sm : null,
              ]}
            >
              <View
                style={[
                  styles.gatewayIcon,
                  {
                    backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSecondary,
                  },
                ]}
              >
                <Ionicons
                  name={method.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                    {t(method.titleKey as any)}
                  </AppText>
                  {method.isRecommended && (
                    <AppBadge
                      label="Recommended"
                      variant="primary"
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
                color={isSelected ? colors.primary : colors.borderStrong}
              />
            </Pressable>
          );
        })}

        {/* Trust Badges (Industry Best Practice) */}
        <View style={styles.trustBadgeContainer}>
          <View style={styles.trustBadgeRow}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
              {t('payment.secure_badge')}
            </AppText>
          </View>
          <AppText
            variant="caption"
            style={{ color: colors.textMuted, textAlign: 'center', marginTop: 4 }}
          >
            Instant refund to source account if seats cannot be confirmed by operator
          </AppText>
        </View>
      </ScrollView>

      {/* 4. Bottom Pay Action Bar */}
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
            isProcessingPayment
              ? 'Opening Secure Payment...'
              : t('payment.pay_btn', { amount: amount.toFixed(2) })
          }
          onPress={handlePay}
          variant="primary"
          size="lg"
          fullWidth
          loading={isProcessingPayment || createIntentMutation.isPending}
          disabled={isProcessingPayment || createIntentMutation.isPending}
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
    paddingTop: 12,
  },
  amountCard: {
    width: '100%',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingRefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  gatewayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeContainer: {
    marginTop: 24,
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
