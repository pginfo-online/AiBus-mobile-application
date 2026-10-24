import React, { useEffect, useRef } from 'react';
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
  const params = useLocalSearchParams<Record<string, string>>();
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function processOutcome() {
      if (hasExecutedRef.current) return;
      hasExecutedRef.current = true;

      const pending = await PendingPaymentStorage.get();
      const mTxnId = params.merchantTxnId || pending?.merchantTxnId || '';
      const bId = params.bookingId || pending?.bookingId || '';

      const parsed = parseRazorpayCallbackParams(params, mTxnId);
      PaymentCoordinator.setHandledByDeepLink(true);
      PaymentCoordinator.notifyResult(parsed);

      if (!isMounted) return;

      const canNavigate = PaymentCoordinator.claimNavigationLock();
      if (!canNavigate) {
        // Navigation already handled by coordinator
        return;
      }

      if (parsed.status === 'SUCCESS' || (parsed.gatewayPaymentId && parsed.gatewaySignature)) {
        if (pending) {
          await PendingPaymentStorage.set({
            ...pending,
            bookingId: bId || pending.bookingId,
            merchantTxnId: mTxnId || pending.merchantTxnId,
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
        router.replace('/booking/review' as any);
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
