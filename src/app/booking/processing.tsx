import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  ScrollView,
  Pressable,
  Alert,
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
import { TicketResponseData, BookingResponseData } from '../../types/api';

const RETRY_DELAYS = [600, 1200, 2000];

export type VerificationPhase =
  | 'VERIFYING'
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

  const [phase, setPhase] = useState<VerificationPhase>('VERIFYING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingResponseData | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<TicketResponseData | null>(null);
  const [copiedPnr, setCopiedPnr] = useState<boolean>(false);

  const verifyMutation = useVerifyPaymentMutation();
  const resetBookingFlow = useBookingStore((s) => s.resetBookingFlow);
  const queryClient = useQueryClient();
  const isCancelledRef = useRef<boolean>(false);
  const hasVerifiedRef = useRef<boolean>(false);

  // Prevent hardware back button while active verification is ongoing
  useEffect(() => {
    const backAction = () => {
      if (isVerifying) return true;
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isVerifying]);

  const executeVerification = useCallback(async () => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    isCancelledRef.current = false;
    setIsVerifying(true);
    setErrorMessage(null);
    setPhase('VERIFYING');

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

    // Fast-fail if gateway reports cancellation or failure
    if (params.status === 'CANCELLED') {
      setIsVerifying(false);
      setPhase('FAILED');
      setErrorMessage(params.errorDescription || 'Payment was cancelled.');
      return;
    }

    if (params.status === 'FAILED') {
      setIsVerifying(false);
      setPhase('FAILED');
      setErrorMessage(params.errorDescription || 'Payment failed or was declined by issuing bank.');
      return;
    }

    if (!mTxnId) {
      setIsVerifying(false);
      setPhase('FAILED');
      setErrorMessage('Missing transaction identifier. If money was debited, your seats will be confirmed shortly.');
      return;
    }

    try {
      let verifiedSuccess = false;
      let finalStatus: string = 'PENDING';
      let serverMessage: string | null = null;
      let lastError: any = null;
      let isNetworkOffline = false;
      let resultBooking: BookingResponseData | null = null;
      let resultTicket: TicketResponseData | null = null;

      // Single-flight verification with short retries for network resilience
      for (let i = 0; i < RETRY_DELAYS.length; i++) {
        if (isCancelledRef.current) return;

        try {
          const res = await verifyMutation.mutateAsync({
            bookingId: bId || '',
            merchantTxnId: mTxnId,
            gatewayOrderId: gOrderId || undefined,
            gatewayPaymentId: gPaymentId || undefined,
            gatewaySignature: gSignature || undefined,
          });

          if (res.status === 'SUCCESS' && res.booking) {
            verifiedSuccess = true;
            resultBooking = res.booking;
            resultTicket = res.ticket || null;

            // Pre-warm React Query cache for instantaneous 0ms ticket render
            const targetBookingId = bId || res.booking.id;
            if (targetBookingId) {
              if (resultTicket) {
                queryClient.setQueryData(['ticket', targetBookingId], resultTicket);
              }
              queryClient.setQueryData(['booking', targetBookingId], res.booking);
            }
            break;
          }

          if (res.status === 'BOOKING_FAILED') {
            finalStatus = 'BOOKING_FAILED';
            resultBooking = res.booking || null;
            serverMessage = res.message || null;
            break;
          }

          if (res.status === 'BOOKING_UNKNOWN') {
            finalStatus = 'BOOKING_UNKNOWN';
            resultBooking = res.booking || null;
            serverMessage = res.message || null;
            break;
          }

          if (i < RETRY_DELAYS.length - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || '');

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

          if (i < RETRY_DELAYS.length - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
          }
        }
      }

      if (isCancelledRef.current) return;

      if (verifiedSuccess) {
        setIsVerifying(false);
        setPhase('SUCCESS');
        setConfirmedBooking(resultBooking);
        setConfirmedTicket(resultTicket);

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Safe fallback
        }

        // Reset transient selection state in booking store
        resetBookingFlow();
      } else if (finalStatus === 'BOOKING_FAILED') {
        setIsVerifying(false);
        setPhase('BOOKING_CONFIRMATION_FAILED');
        setConfirmedBooking(resultBooking);
        setErrorMessage(
          serverMessage ||
            'Your payment was received, but the bus operator could not allocate the selected seat. A 100% full refund has been automatically credited to your AiBus Wallet.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else if (finalStatus === 'BOOKING_UNKNOWN') {
        setIsVerifying(false);
        setPhase('BOOKING_CONFIRMATION_PENDING');
        setConfirmedBooking(resultBooking);
        setErrorMessage(
          serverMessage ||
            'Your payment is secured! The bus operator is finalizing your PNR. We will notify you via SMS within 2 minutes.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else if (finalStatus === 'FAILED') {
        setIsVerifying(false);
        setPhase('FAILED');
        setErrorMessage(
          serverMessage ||
            lastError?.message ||
            'Payment verification failed or was declined by the bank.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Safe fallback
        }
      } else if (isNetworkOffline) {
        setIsVerifying(false);
        setPhase('NETWORK_ERROR');
        setErrorMessage(
          'Could not verify payment due to network disruption. If money was debited, your seats are reserved and your ticket will be confirmed once reconnected.'
        );
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Safe fallback
        }
      } else {
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
    queryClient,
    resetBookingFlow,
    verifyMutation,
  ]);

  useEffect(() => {
    executeVerification();
    return () => {
      isCancelledRef.current = true;
    };
  }, [executeVerification]);

  const handleCopyPnr = (pnr: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Safe fallback
    }
    setCopiedPnr(true);
    Alert.alert('PNR Copied', `PNR ${pnr} copied to clipboard.`);
    setTimeout(() => setCopiedPnr(false), 2500);
  };

  const handleViewTicket = async () => {
    await PendingPaymentStorage.clear();

    const targetBookingId = params.bookingId || confirmedBooking?.id || confirmedTicket?.bookingId;
    if (targetBookingId) {
      try {
        Haptics.selectionAsync();
      } catch {
        // Safe fallback
      }
      router.replace({
        pathname: '/ticket/[bookingId]' as any,
        params: { bookingId: targetBookingId },
      });
    } else {
      router.replace('/(tabs)/bookings' as any);
    }
  };

  const handleGoHome = async () => {
    await PendingPaymentStorage.clear();
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    router.replace('/(tabs)/home' as any);
  };

  const handleViewMyBookings = async () => {
    await PendingPaymentStorage.clear();
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    router.replace('/(tabs)/bookings' as any);
  };

  const seatsDisplay =
    confirmedBooking?.seats?.map((s) => s.seatNo).join(', ') ||
    (params as any).seatNos ||
    'Confirmed';
  const pnrDisplay =
    confirmedTicket?.pnrNumber || confirmedBooking?.providerPnrNo || 'N/A';
  const ticketNoDisplay =
    confirmedTicket?.ticketNumber || confirmedBooking?.providerTicketNo || confirmedBooking?.bookingNumber || '';
  const totalAmountDisplay =
    confirmedBooking?.totalFare != null
      ? `₹${Number(confirmedBooking.totalFare).toFixed(2)}`
      : params.amount
      ? `₹${Number(params.amount).toFixed(2)}`
      : null;
  const operatorName =
    confirmedBooking?.operatorName || 'Bus Operator';
  const busTypeName =
    confirmedBooking?.busType || 'AC Sleeper';
  const primaryPassengerName =
    confirmedBooking?.passengers?.[0]?.name || confirmedBooking?.contactName || 'Passenger';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* 1. ELEGANT, NON-TECHNICAL VERIFYING STATE (Zero steppers, zero jargon) */}
        {isVerifying && (
          <View style={styles.verifyingContainer}>
            <View style={styles.pulseIconCircle}>
              <ActivityIndicator size="large" color="#E65100" />
            </View>

            <AppText variant="heading2" align="center" style={{ color: '#0F172A', marginTop: 24, fontWeight: '800' }}>
              Confirming Your Reservation
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: '#64748B', marginTop: 8, paddingHorizontal: 20, lineHeight: 22 }}
            >
              Assigning your confirmed seat with {operatorName}...
            </AppText>

            {/* Reassurance Badge */}
            <View style={styles.reassurancePill}>
              <Ionicons name="shield-checkmark" size={16} color="#16A34A" style={{ marginRight: 6 }} />
              <AppText variant="caption" style={{ color: '#166534', fontWeight: '700' }}>
                Payment Received • Please do not close or press back
              </AppText>
            </View>
          </View>
        )}

        {/* 2. SUCCESS CONFIRMATION STATE (Instant Celebration Card) */}
        {!isVerifying && phase === 'SUCCESS' && (
          <View style={styles.successContainer}>
            {/* Celebration Green Icon */}
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={84} color="#16A34A" />
            </View>

            <AppText variant="heading1" style={styles.successTitle}>
              Booking Confirmed!
            </AppText>

            <AppText variant="bodyMedium" style={styles.successSubtitle}>
              Your ticket has been booked and SMS/WhatsApp confirmation sent.
            </AppText>

            {/* Confirmed Ticket Snapshot Card */}
            <View style={[styles.ticketSnapshotCard, shadows.md]}>
              {/* Operator Header */}
              <View style={styles.operatorRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800' }}>
                    {operatorName}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
                    {busTypeName}
                  </AppText>
                </View>

                {/* Seat Pill */}
                <View style={styles.seatPill}>
                  <AppText variant="bodySmallMedium" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Seat {seatsDisplay}
                  </AppText>
                </View>
              </View>

              <View style={styles.snapshotDivider} />

              {/* Route & Times */}
              <View style={styles.routeRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ color: '#64748B' }}>
                    BOARDING
                  </AppText>
                  <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800', marginTop: 2 }}>
                    {confirmedBooking?.fromCityName || 'Origin'}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#E65100', fontWeight: '700', marginTop: 2 }}>
                    {confirmedBooking?.pickupTime || '22:00'}
                  </AppText>
                </View>

                <View style={styles.routeArrowWrap}>
                  <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="caption" style={{ color: '#64748B' }}>
                    DROPPING
                  </AppText>
                  <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800', marginTop: 2, textAlign: 'right' }}>
                    {confirmedBooking?.toCityName || 'Destination'}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#64748B', marginTop: 2, textAlign: 'right' }}>
                    {confirmedBooking?.dropoffTime || '07:30'}
                  </AppText>
                </View>
              </View>

              <View style={styles.snapshotDivider} />

              {/* PNR & Ticket Info Bar with Copy button */}
              <View style={styles.pnrBar}>
                <View>
                  <AppText variant="caption" style={{ color: '#64748B' }}>
                    PNR NUMBER
                  </AppText>
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A', marginTop: 2 }}>
                    {pnrDisplay}
                  </AppText>
                </View>

                <Pressable
                  onPress={() => handleCopyPnr(pnrDisplay)}
                  style={styles.copyPnrBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={copiedPnr ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color="#2563EB"
                    style={{ marginRight: 4 }}
                  />
                  <AppText variant="caption" style={{ color: '#2563EB', fontWeight: '700' }}>
                    {copiedPnr ? 'Copied' : 'Copy'}
                  </AppText>
                </Pressable>
              </View>

              {/* Journey Date & Boarding Location */}
              <View style={styles.infoMetaWrap}>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                  <AppText variant="bodySmall" style={{ color: '#334155' }}>
                    Date: <AppText variant="bodySmallMedium" style={{ color: '#0F172A', fontWeight: '700' }}>{confirmedBooking?.journeyDate || 'Today'}</AppText>
                  </AppText>
                </View>

                <View style={[styles.metaRow, { marginTop: 6 }]}>
                  <Ionicons name="person-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                  <AppText variant="bodySmall" style={{ color: '#334155' }}>
                    Passenger: <AppText variant="bodySmallMedium" style={{ color: '#0F172A', fontWeight: '700' }}>{primaryPassengerName}</AppText>
                  </AppText>
                </View>

                {confirmedBooking?.pickupLocation ? (
                  <View style={[styles.metaRow, { marginTop: 6 }]}>
                    <Ionicons name="location-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <AppText variant="bodySmall" style={{ color: '#334155', flex: 1 }} numberOfLines={1}>
                      Boarding Point: {confirmedBooking.pickupLocation}
                    </AppText>
                  </View>
                ) : null}

                {totalAmountDisplay ? (
                  <View style={[styles.metaRow, { marginTop: 6 }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                    <AppText variant="bodySmall" style={{ color: '#16A34A', fontWeight: '700' }}>
                      Paid {totalAmountDisplay} via Razorpay
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Direct Action Buttons */}
            <View style={styles.actionsWrap}>
              <AppButton
                title="View Full Ticket"
                onPress={handleViewTicket}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionBtn}
                icon={<Ionicons name="receipt-outline" size={20} color="#FFFFFF" />}
              />

              <AppButton
                title="Back to Home"
                onPress={handleGoHome}
                variant="outline"
                size="lg"
                fullWidth
                style={[styles.actionBtn, { marginTop: 10 }]}
                icon={<Ionicons name="home-outline" size={20} color={colors.text} />}
              />
            </View>
          </View>
        )}

        {/* 3. OPERATOR DELAYED / RECONCILIATION STATE */}
        {!isVerifying && phase === 'BOOKING_CONFIRMATION_PENDING' && (
          <View style={styles.fallbackContainer}>
            <View style={[styles.fallbackIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={60} color="#D97706" />
            </View>

            <AppText variant="heading2" align="center" style={{ color: '#0F172A', marginTop: 18, fontWeight: '800' }}>
              Reservation In Progress
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: '#64748B', marginTop: 8, paddingHorizontal: 20, lineHeight: 22 }}
            >
              {errorMessage || 'Your payment is secured! The bus operator is finalizing your PNR. We will notify you via SMS within 2 minutes.'}
            </AppText>

            <View style={styles.actionsWrap}>
              <AppButton
                title="Check My Bookings"
                onPress={handleViewMyBookings}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionBtn}
                icon={<Ionicons name="list" size={20} color="#FFFFFF" />}
              />
              <AppButton
                title="Back to Home"
                onPress={handleGoHome}
                variant="outline"
                size="lg"
                fullWidth
                style={[styles.actionBtn, { marginTop: 10 }]}
              />
            </View>
          </View>
        )}

        {/* 4. SEAT ALLOCATION FAILED / AUTO-REFUND STATE */}
        {!isVerifying && phase === 'BOOKING_CONFIRMATION_FAILED' && (
          <View style={styles.fallbackContainer}>
            <View style={[styles.fallbackIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={60} color="#DC2626" />
            </View>

            <AppText variant="heading2" align="center" style={{ color: '#0F172A', marginTop: 18, fontWeight: '800' }}>
              Seat Allocation Issue
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: '#64748B', marginTop: 8, paddingHorizontal: 20, lineHeight: 22 }}
            >
              {errorMessage || 'The bus operator could not allocate your selected seat. A 100% full refund has been credited to your AiBus Wallet.'}
            </AppText>

            <View style={styles.actionsWrap}>
              <AppButton
                title="Choose Another Bus"
                onPress={handleGoHome}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionBtn}
                icon={<Ionicons name="search" size={20} color="#FFFFFF" />}
              />
            </View>
          </View>
        )}

        {/* 5. PAYMENT DECLINED / USER CANCELLED STATE */}
        {!isVerifying && (phase === 'FAILED' || phase === 'NETWORK_ERROR' || phase === 'PENDING_TIMEOUT') && (
          <View style={styles.fallbackContainer}>
            <View style={[styles.fallbackIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={60} color="#DC2626" />
            </View>

            <AppText variant="heading2" align="center" style={{ color: '#0F172A', marginTop: 18, fontWeight: '800' }}>
              Payment Not Completed
            </AppText>

            <AppText
              variant="body"
              align="center"
              style={{ color: '#64748B', marginTop: 8, paddingHorizontal: 20, lineHeight: 22 }}
            >
              {errorMessage || 'The payment was not completed or was declined by the bank.'}
            </AppText>

            <View style={styles.actionsWrap}>
              <AppButton
                title="Try Again"
                onPress={() => router.back()}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionBtn}
                icon={<Ionicons name="refresh" size={20} color="#FFFFFF" />}
              />
              <AppButton
                title="Back to Home"
                onPress={handleGoHome}
                variant="outline"
                size="lg"
                fullWidth
                style={[styles.actionBtn, { marginTop: 10 }]}
              />
            </View>
          </View>
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
    padding: 20,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingVertical: 40,
  },
  pulseIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 28,
  },
  successContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  ticketSnapshotCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  operatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  snapshotDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeArrowWrap: {
    paddingHorizontal: 12,
  },
  pnrBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  copyPnrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  infoMetaWrap: {
    marginTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsWrap: {
    width: '100%',
    marginTop: 24,
  },
  actionBtn: {
    width: '100%',
  },
  fallbackContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingVertical: 30,
  },
  fallbackIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
