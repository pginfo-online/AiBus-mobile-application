import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../design-system/theme';
import { AppText } from '../design-system';
import { parseRazorpayCallbackParams } from '../features/payments/razorpayHelper';
import { PendingPaymentStorage } from '../core/storage';

export default function PaymentResultScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const params = useLocalSearchParams<Record<string, string>>();

  useEffect(() => {
    let isMounted = true;

    async function processOutcome() {
      const pending = await PendingPaymentStorage.get();
      const mTxnId = params.merchantTxnId || pending?.merchantTxnId || '';
      const bId = params.bookingId || pending?.bookingId || '';

      const parsed = parseRazorpayCallbackParams(params, mTxnId);

      if (!isMounted) return;

      if (parsed.status === 'SUCCESS' || (parsed.gatewayPaymentId && parsed.gatewaySignature)) {
        if (pending) {
          await PendingPaymentStorage.set({
            ...pending,
            gatewayOrderId: parsed.gatewayOrderId || pending.gatewayOrderId,
            gatewayPaymentId: parsed.gatewayPaymentId || pending.gatewayPaymentId,
            gatewaySignature: parsed.gatewaySignature || pending.gatewaySignature,
          });
        }

        router.replace({
          pathname: '/booking/processing' as any,
          params: {
            bookingId: bId,
            merchantTxnId: mTxnId,
            gatewayOrderId: parsed.gatewayOrderId || '',
            gatewayPaymentId: parsed.gatewayPaymentId || '',
            gatewaySignature: parsed.gatewaySignature || '',
          },
        });
      } else if (parsed.status === 'CANCELLED') {
        router.replace('/booking/payment' as any);
      } else {
        router.replace({
          pathname: '/booking/processing' as any,
          params: {
            bookingId: bId,
            merchantTxnId: mTxnId,
            errorDescription: parsed.errorDescription || 'Payment was declined',
            status: 'FAILED',
          },
        });
      }
    }

    processOutcome();

    return () => {
      isMounted = false;
    };
  }, [params, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText
        variant="bodyMedium"
        style={{ color: colors.textSecondary, marginTop: spacing.base }}
      >
        Processing payment return...
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
