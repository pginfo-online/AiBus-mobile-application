import React, { useEffect, useState } from 'react';
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

export default function ProcessingPaymentScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{
    bookingId: string;
    merchantTxnId: string;
    amount?: string;
  }>();

  const bookingId = params.bookingId;
  const merchantTxnId = params.merchantTxnId;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const verifyMutation = useVerifyPaymentMutation();
  const resetBookingFlow = useBookingStore((s) => s.resetBookingFlow);

  // Prevent hardware back button while transaction is in flight
  useEffect(() => {
    const backAction = () => {
      if (isVerifying) return true; // block back
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isVerifying]);

  // Execute verification flow
  useEffect(() => {
    let isMounted = true;

    async function executeVerification() {
      if (!bookingId || !merchantTxnId) {
        setErrorMessage('Invalid transaction reference. Please contact customer support.');
        setIsVerifying(false);
        return;
      }

      try {
        // Step 1: Processing
        if (isMounted) setStep(1);
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Step 2: Verifying with bank & PhonePe
        if (isMounted) setStep(2);
        const res = await verifyMutation.mutateAsync({
          bookingId,
          merchantTxnId,
        });

        // Step 3: Confirming with operator
        if (isMounted) setStep(3);
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (res.status === 'SUCCESS') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // Safe fallback
          }
          // Clear active transient booking state
          resetBookingFlow();

          // Navigate directly to confirmed ticket screen
          router.replace({
            pathname: '/ticket/[bookingId]' as any,
            params: { bookingId },
          });
        } else {
          setErrorMessage('Payment confirmation is taking longer than expected. We are checking status.');
          setIsVerifying(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
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
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [bookingId, merchantTxnId, resetBookingFlow, router, verifyMutation]);

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
              {t('payment.processing')}
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
            <View style={[styles.errorIconCircle, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="alert-circle" size={48} color={colors.danger} />
            </View>

            <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
              Transaction Incomplete
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl }}
            >
              {errorMessage}
            </AppText>

            <AppButton
              title="Return to Payment"
              onPress={() => router.back()}
              variant="primary"
              size="lg"
              fullWidth
            />
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
});
