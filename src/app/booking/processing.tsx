import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useVerifyPaymentMutation } from '../../features/payments/usePaymentMutations';
import { useBookingStore } from '../../stores/bookingStore';
import { PendingPaymentStorage } from '../../core/storage';

const BACKOFF_DELAYS = [2000, 3000, 4500, 6000, 8000];

type VerificationPhase = 'VERIFYING_GATEWAY' | 'CONFIRMING_BOOKING' | 'SUCCESS' | 'FAILED' | 'PENDING_TIMEOUT';

export default function ProcessingPaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{
    bookingId?: string;
    merchantTxnId?: string;
    amount?: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
  }>();

  const [phase, setPhase] = useState<VerificationPhase>('VERIFYING_GATEWAY');
  const [statusNote, setStatusNote] = useState<string>('Verifying payment signature with Razorpay & bank...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  const verifyMutation = useVerifyPaymentMutation();
  const resetBookingFlow = useBookingStore((s) => s.resetBookingFlow);
  const isCancelledRef = useRef<boolean>(false);

  // Prevent hardware back button while transaction verification is active
  useEffect(() => {
    const backAction = () => {
      if (isVerifying) return true; // Block hardware back during active verification
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isVerifying]);

  const executeVerification = useCallback(async () => {
    isCancelledRef.current = false;
    setIsVerifying(true);
    setErrorMessage(null);
    setPhase('VERIFYING_GATEWAY');
    setStatusNote('Verifying transaction authenticity with payment gateway...');

    // 1. Resolve identifiers: query params or fallback to persistent storage
    let bId = params.bookingId;
    let mTxnId = params.merchantTxnId;
    let gOrderId = params.gatewayOrderId;
    let gPaymentId = params.gatewayPaymentId;
    let gSignature = params.gatewaySignature;

    if (!bId || !mTxnId) {
      const pending = await PendingPaymentStorage.get();
      if (pending) {
        bId = pending.bookingId;
        mTxnId = pending.merchantTxnId;
        gOrderId = gOrderId || pending.gatewayOrderId;
        gPaymentId = gPaymentId || pending.gatewayPaymentId;
        gSignature = gSignature || pending.gatewaySignature;
      }
    }

    if (!bId || !mTxnId) {
      setIsVerifying(false);
      setErrorMessage(
        'Transaction reference could not be located. If money was deducted, please check your bookings or contact 24/7 customer support.'
      );
      return;
    }

    try {
      setPhase('CONFIRMING_BOOKING');
      setStatusNote('Cryptographically verifying signature & securing seats with bus operator...');

      let verifiedSuccess = false;
      let finalStatus = 'PENDING';
      let lastError: any = null;

      // Verification loop with exponential backoff (for webhook/bank reconciliation)
      for (let i = 0; i < BACKOFF_DELAYS.length; i++) {
        if (isCancelledRef.current) return;
        setAttemptCount(i + 1);

        try {
          const res = await verifyMutation.mutateAsync({
            bookingId: bId,
            merchantTxnId: mTxnId,
            gatewayOrderId: gOrderId || undefined,
            gatewayPaymentId: gPaymentId || undefined,
            gatewaySignature: gSignature || undefined,
          });

          finalStatus = res.status;

          if (res.status === 'SUCCESS') {
            verifiedSuccess = true;
            break;
          } else if (res.status === 'FAILED') {
            break;
          } else {
            // Still PENDING at bank, retry with backoff
            setStatusNote(`Awaiting bank confirmation (attempt ${i + 1}/${BACKOFF_DELAYS.length})...`);
            await new Promise((r) => setTimeout(r, BACKOFF_DELAYS[i]));
          }
        } catch (err: any) {
          lastError = err;
          // Check if booking was marked UNKNOWN or FAILED after payment
          const errMsg = err?.message || '';
          if (errMsg.includes('already confirmed') || errMsg.includes('already completed')) {
            verifiedSuccess = true;
            break;
          }
          if (errMsg.includes('declined') || errMsg.includes('Payment failed') || errMsg.includes('mismatch')) {
            finalStatus = 'FAILED';
            break;
          }

          if (i < BACKOFF_DELAYS.length - 1) {
            await new Promise((r) => setTimeout(r, BACKOFF_DELAYS[i]));
          }
        }
      }

      if (isCancelledRef.current) return;

      if (verifiedSuccess) {
        setPhase('SUCCESS');
        setStatusNote('Payment verified! Your confirmed bus ticket has been issued.');

        // Clean up pending storage record
        await PendingPaymentStorage.clear();

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Safe fallback
        }

        // Reset transient booking state
        resetBookingFlow();

        // Short confirmation pause before navigating to ticket
        setTimeout(() => {
          if (!isCancelledRef.current) {
            router.replace({
              pathname: '/ticket/[bookingId]' as any,
              params: { bookingId: bId },
            });
          }
        }, 500);
      } else if (finalStatus === 'FAILED') {
        await PendingPaymentStorage.clear();
        setIsVerifying(false);
        setPhase('FAILED');
        setErrorMessage(
          lastError?.message ||
            'Payment verification failed or was declined by the bank. If money was debited, it will be automatically refunded within 5-7 business days.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Safe fallback
        }
      } else {
        // Pending timeout after max backoff
        setIsVerifying(false);
        setPhase('PENDING_TIMEOUT');
        setErrorMessage(
          'Your payment confirmation is taking slightly longer with the banking network. If amount was debited, your ticket will be confirmed shortly or automatically refunded.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      }
    } catch (err: any) {
      if (isCancelledRef.current) return;
      setIsVerifying(false);
      setPhase('FAILED');
      setErrorMessage(
        err.message || 'Payment could not be confirmed. If amount was debited, it will be refunded automatically.'
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Safe fallback
      }
    }
  }, [
    params.bookingId,
    params.merchantTxnId,
    params.gatewayOrderId,
    params.gatewayPaymentId,
    params.gatewaySignature,
    resetBookingFlow,
    router,
    verifyMutation,
  ]);

  useEffect(() => {
    executeVerification();
    return () => {
      isCancelledRef.current = true;
    };
  }, [executeVerification]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.contentContainer, { padding: spacing.xl }]}>
        {isVerifying ? (
          <View style={styles.processingCard}>
            <View style={[styles.spinnerCircle, { backgroundColor: colors.primarySoft }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>

            <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.lg }}>
              {t('payment.verifying')}
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: colors.textSecondary, marginTop: spacing.xs, paddingHorizontal: 16 }}
            >
              {statusNote}
            </AppText>

            {/* Stepper Status Indicators */}
            <View style={[styles.stepperContainer, { marginTop: spacing.xl }]}>
              {/* Step 1: Gateway Authorization */}
              <View style={styles.stepRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.success}
                />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyMedium" style={{ fontWeight: '600', color: colors.text }}>
                    Payment Authorized
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Authorization received from payment gateway
                  </AppText>
                </View>
              </View>

              <View style={[styles.stepLine, { backgroundColor: colors.success }]} />

              {/* Step 2: Signature Verification & Operator Sync */}
              <View style={styles.stepRow}>
                <Ionicons
                  name={phase === 'CONFIRMING_BOOKING' || phase === 'SUCCESS' ? 'checkmark-circle' : 'time-outline'}
                  size={22}
                  color={phase === 'CONFIRMING_BOOKING' || phase === 'SUCCESS' ? colors.success : colors.warning}
                />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyMedium" style={{ fontWeight: '600', color: colors.text }}>
                    Cryptographic Verification
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Verifying HMAC signature with Razorpay servers
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: phase === 'SUCCESS' ? colors.success : colors.border },
                ]}
              />

              {/* Step 3: Ticket Issuance */}
              <View style={styles.stepRow}>
                <Ionicons
                  name={phase === 'SUCCESS' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={phase === 'SUCCESS' ? colors.success : colors.textMuted}
                />
                <View style={{ marginLeft: 12 }}>
                  <AppText
                    variant="bodyMedium"
                    style={{
                      fontWeight: '600',
                      color: phase === 'SUCCESS' ? colors.text : colors.textMuted,
                    }}
                  >
                    Ticket Confirmation
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Generating official PNR & booking ticket
                  </AppText>
                </View>
              </View>
            </View>

            <AppText
              variant="caption"
              align="center"
              style={{ color: colors.textMuted, marginTop: 32 }}
            >
              {t('payment.processing')}
            </AppText>
          </View>
        ) : (
          <AppCard variant="elevated" padding="lg" style={[styles.errorCard, shadows.md]}>
            <View
              style={[
                styles.errorIconCircle,
                {
                  backgroundColor:
                    phase === 'PENDING_TIMEOUT' ? colors.warningSoft : colors.dangerSoft,
                },
              ]}
            >
              <Ionicons
                name={phase === 'PENDING_TIMEOUT' ? 'time-outline' : 'alert-circle'}
                size={44}
                color={phase === 'PENDING_TIMEOUT' ? colors.warning : colors.danger}
              />
            </View>

            <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
              {phase === 'PENDING_TIMEOUT' ? 'Payment Status Pending' : 'Payment Verification Failed'}
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg }}
            >
              {errorMessage}
            </AppText>

            <View style={styles.actionButtonGroup}>
              <AppButton
                title="Retry Verification"
                onPress={() => executeVerification()}
                variant="primary"
                size="lg"
                fullWidth
              />
              <View style={{ height: 12 }} />
              <AppButton
                title="Check My Bookings"
                onPress={() => router.replace('/(tabs)/bookings' as any)}
                variant="outline"
                size="md"
                fullWidth
              />
              <View style={{ height: 8 }} />
              <AppButton
                title="Return to Payment Methods"
                onPress={() => router.back()}
                variant="ghost"
                size="sm"
                fullWidth
              />
            </View>
          </AppCard>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    alignItems: 'center',
    width: '100%',
  },
  spinnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepLine: {
    width: 2,
    height: 28,
    marginLeft: 10,
    marginVertical: 4,
  },
  errorCard: {
    alignItems: 'center',
    width: '100%',
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonGroup: {
    width: '100%',
    marginTop: 8,
  },
});
