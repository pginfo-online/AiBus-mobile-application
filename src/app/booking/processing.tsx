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

export default function ProcessingPaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{
    bookingId?: string;
    merchantTxnId?: string;
    amount?: string;
  }>();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [statusNote, setStatusNote] = useState<string>('Initiating verification with payment gateway...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [attemptCount, setAttemptCount] = useState(0);

  const verifyMutation = useVerifyPaymentMutation();
  const resetBookingFlow = useBookingStore((s) => s.resetBookingFlow);
  const isCancelledRef = useRef(false);

  // Prevent hardware back button while transaction is in flight
  useEffect(() => {
    const backAction = () => {
      if (isVerifying) return true; // block back during active verification
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isVerifying]);

  const executeVerification = useCallback(async () => {
    isCancelledRef.current = false;
    setIsVerifying(true);
    setErrorMessage(null);
    setStep(1);
    setStatusNote('Contacting payment gateway...');

    // 1. Resolve identifiers: query params or fallback to persistent storage
    let bId = params.bookingId;
    let mTxnId = params.merchantTxnId;

    if (!bId || !mTxnId) {
      const pending = await PendingPaymentStorage.get();
      if (pending) {
        bId = pending.bookingId;
        mTxnId = pending.merchantTxnId;
      }
    }

    if (!bId || !mTxnId) {
      setIsVerifying(false);
      setErrorMessage('Missing transaction reference. If amount was deducted, please check My Bookings or contact support.');
      return;
    }

    try {
      // Step 1: Processing delay for smooth UX
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (isCancelledRef.current) return;

      setStep(2);
      setStatusNote('Verifying transaction status with PhonePe & banking partner...');

      // Polling loop with exponential backoff
      let verifiedSuccess = false;
      let finalStatus = 'PENDING';
      let lastError = null;

      for (let i = 0; i < BACKOFF_DELAYS.length; i++) {
        if (isCancelledRef.current) return;
        setAttemptCount(i + 1);

        try {
          const res = await verifyMutation.mutateAsync({
            bookingId: bId,
            merchantTxnId: mTxnId,
          });

          finalStatus = res.status;

          if (res.status === 'SUCCESS') {
            verifiedSuccess = true;
            break;
          } else if (res.status === 'FAILED') {
            break;
          } else {
            // Still PENDING, wait with backoff
            setStatusNote(`Awaiting bank confirmation (attempt ${i + 1}/${BACKOFF_DELAYS.length})...`);
            await new Promise((r) => setTimeout(r, BACKOFF_DELAYS[i]));
          }
        } catch (err: any) {
          lastError = err;
          if (i < BACKOFF_DELAYS.length - 1) {
            await new Promise((r) => setTimeout(r, BACKOFF_DELAYS[i]));
          }
        }
      }

      if (isCancelledRef.current) return;

      if (verifiedSuccess) {
        setStep(3);
        setStatusNote('Payment confirmed! Issuing confirmed ticket...');
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Clean up pending storage record
        await PendingPaymentStorage.clear();

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Safe fallback
        }

        // Reset transient booking selection store
        resetBookingFlow();

        // Navigate to confirmed ticket
        router.replace({
          pathname: '/ticket/[bookingId]' as any,
          params: { bookingId: bId },
        });
      } else if (finalStatus === 'FAILED') {
        await PendingPaymentStorage.clear();
        setIsVerifying(false);
        setErrorMessage('Payment failed or was declined by the bank. If money was debited, it will be refunded automatically within 5-7 business days.');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Safe fallback
        }
      } else {
        // Still pending after backoff
        setIsVerifying(false);
        setErrorMessage(
          lastError?.message ||
          'Payment status is currently pending with your bank. If the amount was debited, your ticket will be confirmed shortly or refunded automatically.'
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
      setErrorMessage(
        err.message || 'Payment could not be verified. If amount was debited, it will be refunded automatically.'
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Safe fallback
      }
    }
  }, [params.bookingId, params.merchantTxnId, resetBookingFlow, router, verifyMutation]);

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

            <AppText variant="body" align="center" style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {statusNote}
            </AppText>

            {/* Stepper Status Indicators */}
            <View style={[styles.stepperContainer, { marginTop: spacing.xl }]}>
              <View style={styles.stepRow}>
                <Ionicons
                  name={step >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={step >= 1 ? colors.success : colors.textMuted}
                />
                <AppText
                  variant="bodyMedium"
                  style={{
                    color: step >= 1 ? colors.text : colors.textMuted,
                    marginLeft: 10,
                  }}
                >
                  Initiating PhonePe transaction
                </AppText>
              </View>

              <View style={[styles.stepLine, { backgroundColor: step >= 2 ? colors.success : colors.border }]} />

              <View style={styles.stepRow}>
                <Ionicons
                  name={step >= 2 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={step >= 2 ? colors.success : colors.textMuted}
                />
                <AppText
                  variant="bodyMedium"
                  style={{
                    color: step >= 2 ? colors.text : colors.textMuted,
                    marginLeft: 10,
                  }}
                >
                  Verifying payment confirmation
                </AppText>
              </View>

              <View style={[styles.stepLine, { backgroundColor: step >= 3 ? colors.success : colors.border }]} />

              <View style={styles.stepRow}>
                <Ionicons
                  name={step >= 3 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={step >= 3 ? colors.success : colors.textMuted}
                />
                <AppText
                  variant="bodyMedium"
                  style={{
                    color: step >= 3 ? colors.text : colors.textMuted,
                    marginLeft: 10,
                  }}
                >
                  Issuing confirmed bus ticket
                </AppText>
              </View>
            </View>
          </View>
        ) : (
          <AppCard variant="elevated" padding="lg" style={[styles.errorCard, shadows.md]}>
            <View style={[styles.errorIconCircle, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="alert-circle" size={44} color={colors.warning} />
            </View>

            <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
              Verification Notice
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
                onPress={() => router.replace('/(tabs)/trips' as any)}
                variant="outline"
                size="md"
                fullWidth
              />
              <View style={{ height: 8 }} />
              <AppButton
                title="Return to Payment"
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
    paddingHorizontal: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepLine: {
    width: 2,
    height: 24,
    marginLeft: 9,
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
