import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  ScrollView,
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
  AppBadge,
} from '../../design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../../core/localization';
import { useVerifyPaymentMutation } from '../../features/payments/usePaymentMutations';
import { useBookingStore } from '../../stores/bookingStore';
import { PendingPaymentStorage } from '../../core/storage';
import { TicketResponseData } from '../../types/api';

const BACKOFF_DELAYS = [400, 600, 1000, 1500, 2000];

export type VerificationPhase =
  | 'VERIFYING_GATEWAY'
  | 'CONFIRMING_BOOKING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING_TIMEOUT'
  | 'BOOKING_CONFIRMATION_FAILED'
  | 'BOOKING_CONFIRMATION_PENDING'
  | 'NETWORK_ERROR';

export default function ProcessingPaymentScreen() {
  const router = useRouter();
  const { colors, spacing, shadows } = useAppTheme();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{
    bookingId?: string;
    merchantTxnId?: string;
    amount?: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    status?: string;
    errorDescription?: string;
  }>();

  const [phase, setPhase] = useState<VerificationPhase>('VERIFYING_GATEWAY');
  const [statusNote, setStatusNote] = useState<string>('Verifying transaction authenticity with Razorpay...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  const verifyMutation = useVerifyPaymentMutation();
  const resetBookingFlow = useBookingStore((s) => s.resetBookingFlow);
  const queryClient = useQueryClient();
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
    setStatusNote('Verifying transaction authenticity with Razorpay...');

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
      setPhase('FAILED');
      setErrorMessage(
        'Transaction reference could not be located. If money was deducted, please check your bookings or contact 24/7 customer support.'
      );
      return;
    }

    // Check if directly passed failure from gateway callback
    if (params.status === 'FAILED') {
      setIsVerifying(false);
      setPhase('FAILED');
      setErrorMessage(
        params.errorDescription || 'Payment was declined by issuing bank or cancelled.'
      );
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Safe fallback
      }
      return;
    }

    try {
      setPhase('CONFIRMING_BOOKING');
      setStatusNote('Cryptographically verifying signature & securing seats with bus operator...');

      let verifiedSuccess = false;
      let finalStatus: string = 'PENDING';
      let serverMessage: string | undefined;
      let lastError: any = null;
      let isNetworkOffline = false;

      // Verification loop with exponential backoff (for webhook/bank reconciliation)
      for (let i = 0; i < BACKOFF_DELAYS.length; i++) {
        if (isCancelledRef.current) return;

        try {
          const res = await verifyMutation.mutateAsync({
            bookingId: bId,
            merchantTxnId: mTxnId,
            gatewayOrderId: gOrderId || undefined,
            gatewayPaymentId: gPaymentId || undefined,
            gatewaySignature: gSignature || undefined,
          });

          finalStatus = res.status;
          serverMessage = res.message;

          if (res.status === 'SUCCESS') {
            verifiedSuccess = true;
            // Pre-populate React Query cache so the ticket screen renders instantaneously (0ms)
            const ticketData: TicketResponseData = res.ticket || {
              id: res.booking?.ticket?.ticketNumber || bId,
              bookingId: bId,
              ticketNumber: res.booking?.ticket?.ticketNumber || res.booking?.providerTicketNo || res.booking?.bookingNumber,
              pnrNumber: res.booking?.ticket?.pnrNumber || res.booking?.providerPnrNo || 'N/A',
              status: 'ISSUED',
              generatedAt: new Date().toISOString(),
              booking: res.booking,
            };
            queryClient.setQueryData(['tickets', 'booking', bId], ticketData);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            break;
          } else if (res.status === 'BOOKING_FAILED') {
            finalStatus = 'BOOKING_FAILED';
            break;
          } else if (res.status === 'BOOKING_UNKNOWN') {
            finalStatus = 'BOOKING_UNKNOWN';
            break;
          } else if (res.status === 'FAILED') {
            finalStatus = 'FAILED';
            break;
          } else {
            // Still PENDING at bank, retry with snappy backoff
            setStatusNote(`Securing confirmed seat with operator (attempt ${i + 1}/${BACKOFF_DELAYS.length})...`);
            await new Promise((r) => setTimeout(r, BACKOFF_DELAYS[i]));
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || '';

          if (errMsg.includes('already confirmed') || errMsg.includes('already completed')) {
            verifiedSuccess = true;
            break;
          }

          if (
            err?.code === 'NETWORK_DISCONNECTED' ||
            errMsg.includes('No internet') ||
            errMsg.includes('Network Error')
          ) {
            isNetworkOffline = true;
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

        // Navigate immediately to ticket screen without artificial delay
        if (!isCancelledRef.current) {
          router.replace({
            pathname: '/ticket/[bookingId]' as any,
            params: { bookingId: bId },
          });
        }
      } else if (finalStatus === 'BOOKING_FAILED') {
        // Scenario 9: Payment succeeded, but bus operator reservation failed
        await PendingPaymentStorage.clear();
        setIsVerifying(false);
        setPhase('BOOKING_CONFIRMATION_FAILED');
        setErrorMessage(
          serverMessage ||
            t('payment.booking_failed_desc') ||
            'Your payment was received, but the bus operator could not allocate the selected seats. A 100% full refund has been automatically initiated to your account.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else if (finalStatus === 'BOOKING_UNKNOWN') {
        // Scenario 10: Payment succeeded, but upstream operator reservation timed out
        setIsVerifying(false);
        setPhase('BOOKING_CONFIRMATION_PENDING');
        setErrorMessage(
          serverMessage ||
            t('payment.booking_unknown_desc') ||
            'Your payment is secured! We are confirming your seats with the bus operator. Please do not re-book or pay again.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else if (finalStatus === 'FAILED') {
        // Scenario 2: Payment failed or declined
        await PendingPaymentStorage.clear();
        setIsVerifying(false);
        setPhase('FAILED');
        setErrorMessage(
          serverMessage ||
            lastError?.message ||
            t('payment.failed') ||
            'Payment verification failed or was declined by the bank.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Safe fallback
        }
      } else if (isNetworkOffline) {
        // Scenario 5: Network disconnected during verification
        setIsVerifying(false);
        setPhase('NETWORK_ERROR');
        setErrorMessage(
          t('payment.network_error_desc') ||
            'Could not verify payment due to network disruption. If money was debited, your seats are reserved and your ticket will be confirmed once reconnected.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else {
        // Scenario 4 & 8: Pending timeout after max backoff
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
    params.status,
    params.errorDescription,
    resetBookingFlow,
    router,
    t,
    verifyMutation,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeVerification();
    }, 0);
    return () => {
      clearTimeout(timer);
      isCancelledRef.current = true;
    };
  }, [executeVerification]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.contentContainer, { padding: spacing.xl }]}>
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
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyMedium" style={{ fontWeight: '600', color: colors.text }}>
                    Payment Authorized
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Razorpay live checkout authorized
                  </AppText>
                </View>
              </View>

              <View style={[styles.stepLine, { backgroundColor: colors.success }]} />

              {/* Step 2: Signature Verification */}
              <View style={styles.stepRow}>
                <Ionicons
                  name={phase === 'CONFIRMING_BOOKING' || phase === 'SUCCESS' ? 'checkmark-circle' : 'time-outline'}
                  size={22}
                  color={phase === 'CONFIRMING_BOOKING' || phase === 'SUCCESS' ? colors.success : colors.warning}
                />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyMedium" style={{ fontWeight: '600', color: colors.text }}>
                    Cryptographic Signature Verification
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    HMAC-SHA256 authenticity verified on backend
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
                    Ticket & Seat Reservation
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    Confirming PNR with bus operator reservation system
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
            {/* Outcome Icon & Styling based on Phase */}
            {phase === 'BOOKING_CONFIRMATION_FAILED' && (
              <>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="refresh-circle" size={44} color={colors.warning} />
                </View>
                <AppBadge label="Payment Received • Refund Initiated" variant="warning" style={{ marginTop: 12 }} />
                <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
                  {t('payment.booking_failed_title')}
                </AppText>
              </>
            )}

            {phase === 'BOOKING_CONFIRMATION_PENDING' && (
              <>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="time-outline" size={44} color={colors.primary} />
                </View>
                <AppBadge label="Payment Secured • Allocation In Progress" variant="primary" style={{ marginTop: 12 }} />
                <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
                  {t('payment.booking_unknown_title')}
                </AppText>
              </>
            )}

            {phase === 'NETWORK_ERROR' && (
              <>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="cloud-offline-outline" size={44} color={colors.warning} />
                </View>
                <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
                  {t('payment.network_error_title')}
                </AppText>
              </>
            )}

            {phase === 'PENDING_TIMEOUT' && (
              <>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="time-outline" size={44} color={colors.warning} />
                </View>
                <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
                  Payment Status Pending
                </AppText>
              </>
            )}

            {phase === 'FAILED' && (
              <>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.dangerSoft }]}>
                  <Ionicons name="alert-circle" size={44} color={colors.danger} />
                </View>
                <AppText variant="heading2" align="center" style={{ color: colors.text, marginTop: spacing.md }}>
                  Payment Verification Failed
                </AppText>
              </>
            )}

            <AppText
              variant="body"
              align="center"
              style={{ color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg }}
            >
              {errorMessage}
            </AppText>

            {/* Action Buttons mapped to specific outcome */}
            <View style={styles.actionButtonGroup}>
              {phase === 'BOOKING_CONFIRMATION_FAILED' ? (
                <>
                  <AppButton
                    title="Search Other Buses"
                    onPress={() => router.replace('/search/buses' as any)}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="bus-outline" size={18} color="#FFFFFF" />}
                  />
                  <View style={{ height: 12 }} />
                  <AppButton
                    title="View in My Bookings"
                    onPress={() => router.replace('/(tabs)/bookings' as any)}
                    variant="outline"
                    size="md"
                    fullWidth
                  />
                  <View style={{ height: 8 }} />
                  <AppButton
                    title="Go to Home"
                    onPress={() => router.replace('/(tabs)/home' as any)}
                    variant="ghost"
                    size="sm"
                    fullWidth
                  />
                </>
              ) : phase === 'BOOKING_CONFIRMATION_PENDING' ? (
                <>
                  <AppButton
                    title="Check Status Now"
                    onPress={() => executeVerification()}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="refresh-outline" size={18} color="#FFFFFF" />}
                  />
                  <View style={{ height: 12 }} />
                  <AppButton
                    title="Check in My Bookings"
                    onPress={() => router.replace('/(tabs)/bookings' as any)}
                    variant="outline"
                    size="md"
                    fullWidth
                  />
                </>
              ) : (
                <>
                  <AppButton
                    title={phase === 'NETWORK_ERROR' ? 'Retry Connection' : 'Retry Verification'}
                    onPress={() => executeVerification()}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
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
                </>
              )}
            </View>
          </AppCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
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
