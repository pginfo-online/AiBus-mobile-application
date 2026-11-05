import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../design-system/theme';
import { AppText } from '../design-system';
import { parseRazorpayCallbackParams } from '../features/payments/razorpayHelper';
import { PaymentCoordinator } from '../features/payments/PaymentCoordinator';
import { PendingPaymentStorage } from '../core/storage';

export default function PaymentResultScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const { bookingId, merchantTxnId, gatewayOrderId, gatewayPaymentId, gatewaySignature,
    razorpay_order_id, razorpay_payment_id, razorpay_signature, status,
  } = useLocalSearchParams<Record<string, string>>();

  useEffect(() => {
    let mounted = true;

    async function processOutcome() {
      const pending = await PendingPaymentStorage.get();
      if (!mounted) return;
      const transactionId = merchantTxnId || pending?.merchantTxnId;
      const id = bookingId || (pending?.merchantTxnId === transactionId ? pending?.bookingId : undefined);
      if (!id || !transactionId) {
        router.replace('/(tabs)/bookings');
        return;
      }

      const result = parseRazorpayCallbackParams({
        gatewayOrderId, gatewayPaymentId, gatewaySignature, razorpay_order_id,
        razorpay_payment_id, razorpay_signature, status,
      }, transactionId);
      PaymentCoordinator.setHandledByDeepLink(true);
      PaymentCoordinator.notifyResult(result);

      if (pending?.bookingId === id && pending.merchantTxnId === transactionId && result.gatewayPaymentId) {
        await PendingPaymentStorage.set({
          ...pending,
          gatewayOrderId: result.gatewayOrderId || pending.gatewayOrderId,
          gatewayPaymentId: result.gatewayPaymentId,
          gatewaySignature: result.gatewaySignature || pending.gatewaySignature,
        });
      }
      if (!mounted) return;
      router.replace({
        pathname: '/booking/processing',
        params: { bookingId: id, merchantTxnId: transactionId },
      });
    }

    void processOutcome();
    return () => { mounted = false; };
  }, [
    bookingId, merchantTxnId, gatewayOrderId, gatewayPaymentId, gatewaySignature,
    razorpay_order_id, razorpay_payment_id, razorpay_signature, status, router,
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText
        variant="bodyMedium"
        style={{ color: colors.textSecondary, marginTop: spacing.base }}
      >
        Confirming payment return...
      </AppText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
