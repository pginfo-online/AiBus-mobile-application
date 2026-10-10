import React, { useState, useEffect } from 'react';
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
import { useCreatePaymentIntentMutation } from '../../features/payments/usePaymentMutations';
import { PendingPaymentStorage } from '../../core/storage';

export default function PaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const {
    activeHold,
    activeBookingId,
    activeBookingNumber,
  } = useBookingStore();

  const [selectedGateway, setSelectedGateway] = useState<'PHONEPE' | 'CARD' | 'NETBANKING'>('PHONEPE');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);

  const createIntentMutation = useCreatePaymentIntentMutation();

  // Active Seat Hold Countdown Timer
  useEffect(() => {
    if (!activeHold?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setSecondsRemaining(remainingSecs);

      if (remainingSecs <= 0) {
        clearInterval(interval);
        Alert.alert(
          'Hold Expired',
          'Your 10-minute seat hold time has expired. Please select your seats again.',
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

  const handlePay = async () => {
    if (!activeBookingId) {
      Alert.alert('Error', 'No active booking session found.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }

    try {
      // 1. Create payment intent on backend
      const intentRes = await createIntentMutation.mutateAsync({
        bookingId: activeBookingId,
        gateway: 'PHONEPE',
      });

      // 2. Persist pending transaction metadata to secure storage (process death resilience)
      await PendingPaymentStorage.set({
        bookingId: activeBookingId,
        merchantTxnId: intentRes.merchantTxnId,
        amount: intentRes.amount,
        timestamp: Date.now(),
      });

      // 3. Launch PhonePe checkout via WebBrowser
      if (intentRes.paymentUrl) {
        try {
          await WebBrowser.openAuthSessionAsync(
            intentRes.paymentUrl,
            'aibus://payment-result'
          );
        } catch {
          try {
            await WebBrowser.openBrowserAsync(intentRes.paymentUrl);
          } catch {
            // Proceed to processing screen
          }
        }
      }

      // 4. Advance to transaction processing & verification screen
      router.push({
        pathname: '/booking/processing' as any,
        params: {
          bookingId: activeBookingId,
          merchantTxnId: intentRes.merchantTxnId,
          amount: String(intentRes.amount),
        },
      });
    } catch (err: any) {
      Alert.alert(
        'Payment Initiation Failed',
        err.message || 'Unable to connect to payment gateway. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 1. Timer Banner */}
      <View style={[styles.timerBanner, { backgroundColor: colors.warningSoft, borderBottomColor: colors.warningBorder }]}>
        <Ionicons name="time-outline" size={18} color={colors.warning} />
        <AppText variant="bodySmallMedium" style={{ color: colors.warning, marginLeft: 6 }}>
          {t('payment.timer')}: <AppText variant="bodySmallMedium" style={{ fontWeight: '700', color: colors.warning }}>{formattedTimer}</AppText>
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
            <AppBadge label="Booking HELD" variant="success" />
          </View>

          <AppDivider spacingMargin="sm" />

          <AppText variant="caption" style={{ color: colors.textMuted }}>
            Booking Reference: {activeBookingNumber || 'Generating...'}
          </AppText>
        </AppCard>

        {/* 3. Payment Methods */}
        <AppText variant="heading3" style={{ color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }}>
          {t('payment.title')}
        </AppText>

        {/* Option 1: PhonePe UPI (Recommended) */}
        <Pressable
          onPress={() => setSelectedGateway('PHONEPE')}
          style={({ pressed }) => [
            styles.gatewayCard,
            {
              backgroundColor: colors.surface,
              borderColor: selectedGateway === 'PHONEPE' ? colors.primary : colors.border,
              borderWidth: selectedGateway === 'PHONEPE' ? 2 : 1,
              borderRadius: radii.lg,
              opacity: pressed ? 0.85 : 1,
            },
            selectedGateway === 'PHONEPE' ? shadows.sm : null,
          ]}
        >
          <View style={[styles.gatewayIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                {t('payment.phonepe_upi')}
              </AppText>
              <AppBadge label="Recommended" variant="primary" size="sm" style={{ marginLeft: 8 }} />
            </View>
            <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
              Pay via Google Pay, PhonePe, Paytm or UPI ID
            </AppText>
          </View>
          <Ionicons
            name={selectedGateway === 'PHONEPE' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={selectedGateway === 'PHONEPE' ? colors.primary : colors.borderStrong}
          />
        </Pressable>

        {/* Option 2: Cards */}
        <Pressable
          onPress={() => setSelectedGateway('CARD')}
          style={({ pressed }) => [
            styles.gatewayCard,
            {
              backgroundColor: colors.surface,
              borderColor: selectedGateway === 'CARD' ? colors.primary : colors.border,
              borderWidth: selectedGateway === 'CARD' ? 2 : 1,
              borderRadius: radii.lg,
              opacity: pressed ? 0.85 : 1,
              marginTop: spacing.sm,
            },
            selectedGateway === 'CARD' ? shadows.sm : null,
          ]}
        >
          <View style={[styles.gatewayIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="card-outline" size={24} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
              {t('payment.cards')}
            </AppText>
            <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
              Visa, Mastercard, RuPay, Maestro
            </AppText>
          </View>
          <Ionicons
            name={selectedGateway === 'CARD' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={selectedGateway === 'CARD' ? colors.primary : colors.borderStrong}
          />
        </Pressable>

        {/* Option 3: NetBanking */}
        <Pressable
          onPress={() => setSelectedGateway('NETBANKING')}
          style={({ pressed }) => [
            styles.gatewayCard,
            {
              backgroundColor: colors.surface,
              borderColor: selectedGateway === 'NETBANKING' ? colors.primary : colors.border,
              borderWidth: selectedGateway === 'NETBANKING' ? 2 : 1,
              borderRadius: radii.lg,
              opacity: pressed ? 0.85 : 1,
              marginTop: spacing.sm,
            },
            selectedGateway === 'NETBANKING' ? shadows.sm : null,
          ]}
        >
          <View style={[styles.gatewayIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="business-outline" size={24} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
              {t('payment.netbanking')}
            </AppText>
            <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
              SBI, HDFC, ICICI, Axis & 50+ Banks
            </AppText>
          </View>
          <Ionicons
            name={selectedGateway === 'NETBANKING' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={selectedGateway === 'NETBANKING' ? colors.primary : colors.borderStrong}
          />
        </Pressable>

        {/* Security Trust Badge */}
        <View style={styles.trustBadgeRow}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
            256-Bit SSL Encrypted • 100% Safe & Secure Payments
          </AppText>
        </View>
      </ScrollView>

      {/* 4. Bottom Pay Action */}
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
          title={t('payment.pay_btn', { amount: amount.toFixed(2) })}
          onPress={handlePay}
          variant="primary"
          size="lg"
          fullWidth
          loading={createIntentMutation.isPending}
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
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
