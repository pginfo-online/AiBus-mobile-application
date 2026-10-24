import React, { useState, useMemo } from 'react';
import {
  View,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppDivider,
  AppBadge,
} from '../../design-system';
import { BookingResponseData, CancellationResultResponse } from '../../types/api';
import {
  useCheckCancellabilityQuery,
  useCancelBookingMutation,
} from './useCancellation';

interface CancelTicketModalProps {
  visible: boolean;
  onClose: () => void;
  booking: BookingResponseData;
  ticketNumber?: string;
  pnrNumber?: string;
  onCancelled?: (result: CancellationResultResponse) => void;
}

const CANCEL_REASONS = [
  'Change of travel plans',
  'Booked wrong date or route',
  'Found alternative transport',
  'Personal or medical emergency',
  'Bus operator rescheduled or cancelled',
  'Other reason',
];

export function CancelTicketModal({
  visible,
  onClose,
  booking,
  ticketNumber,
  pnrNumber,
  onCancelled,
}: CancelTicketModalProps) {
  const { colors, spacing, radii, shadows } = useAppTheme();
  const allSeatNos = useMemo(
    () => booking.seats?.map((s) => s.seatNo) || [],
    [booking.seats]
  );

  const [selectedSeats, setSelectedSeats] = useState<string[]>(allSeatNos);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [successResult, setSuccessResult] = useState<CancellationResultResponse | null>(null);

  // Sync state when modal visibility changes
  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (visible) {
      setSelectedSeats(allSeatNos);
      setSuccessResult(null);
    }
  }

  // Query live cancellability and refund breakdown from backend
  const {
    data: cancellableInfo,
    isLoading: isChecking,
    isError: isCheckError,
  } = useCheckCancellabilityQuery(booking.id, selectedSeats, visible && !successResult);

  const cancelMutation = useCancelBookingMutation();

  const toggleSeatSelection = (seatNo: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    if (selectedSeats.includes(seatNo)) {
      if (selectedSeats.length === 1) {
        Alert.alert('Selection Error', 'At least one seat must be selected for cancellation.');
        return;
      }
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNo));
    } else {
      setSelectedSeats([...selectedSeats, seatNo]);
    }
  };

  const handleConfirmCancellation = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats Selected', 'Please select at least one seat to cancel.');
      return;
    }

    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Safe fallback
      }

      const result = await cancelMutation.mutateAsync({
        bookingId: booking.id,
        seatNos: selectedSeats,
        reason: selectedReason,
        refundToWallet: true,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Safe fallback
      }

      setSuccessResult(result);
      if (onCancelled) {
        onCancelled(result);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Cancellation request failed';
      Alert.alert('Cancellation Error', msg);
    }
  };

  const handleFinish = () => {
    setSuccessResult(null);
    onClose();
  };

  // Estimated refund values
  const refundAmount = cancellableInfo?.RefundAmount ?? 0;
  const chargeAmount = cancellableInfo?.CancellationCharge ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={successResult ? handleFinish : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading3" style={{ color: colors.text }}>
                {successResult ? 'Cancellation Confirmed' : 'Cancel Ticket'}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Booking #{booking.bookingNumber} &bull; PNR {pnrNumber || booking.providerPnrNo || 'N/A'}
              </AppText>
            </View>

            <Pressable
              onPress={successResult ? handleFinish : onClose}
              style={[styles.closeCircle, { backgroundColor: colors.surfaceSecondary }]}
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing.base, paddingBottom: 36 }}
          >
            {successResult ? (
              /* Success View */
              <View style={styles.successContainer}>
                <View style={[styles.successIconBox, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="checkmark-circle" size={54} color={colors.success} />
                </View>

                <AppText variant="heading2" style={{ color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
                  Cancellation Successful
                </AppText>

                <AppText variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Your bus reservation for seat(s) {selectedSeats.join(', ')} has been cancelled.
                </AppText>

                {/* Wallet Refund Card */}
                <AppCard
                  variant="elevated"
                  padding="base"
                  style={[styles.walletRefundCard, shadows.sm, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.walletIconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="wallet" size={24} color="#16A34A" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <AppText variant="caption" style={{ color: '#15803D', fontWeight: '700', textTransform: 'uppercase' }}>
                        Refund Credited to Wallet
                      </AppText>
                      <AppText variant="heading2" style={{ color: '#15803D' }}>
                        ₹{Number(successResult.refund?.amount || refundAmount).toFixed(2)}
                      </AppText>
                    </View>
                  </View>

                  <AppDivider spacingMargin="sm" />

                  <AppText variant="caption" style={{ color: '#166534', lineHeight: 18 }}>
                    The refund amount has been instantly added to your AiBus Wallet. You can use it towards your next booking anytime without expiration.
                  </AppText>
                </AppCard>

                <AppButton
                  title="Done"
                  onPress={handleFinish}
                  variant="primary"
                  fullWidth
                  style={{ marginTop: spacing.xl }}
                />
              </View>
            ) : (
              /* Cancellation Form View */
              <View>
                {/* Route Header */}
                <View style={[styles.routeBanner, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
                  <View>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      {booking.fromCityName} → {booking.toCityName}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                      {booking.operatorName} • {booking.journeyDate}
                    </AppText>
                  </View>
                  <AppBadge label="Confirmed" variant="success" size="sm" />
                </View>

                {/* Seat Selector (if multiple seats) */}
                {allSeatNos.length > 1 && (
                  <View style={{ marginTop: spacing.md }}>
                    <AppText variant="bodySmallMedium" style={{ color: colors.text, marginBottom: 8 }}>
                      Select Seats to Cancel
                    </AppText>
                    <View style={styles.seatPillsRow}>
                      {allSeatNos.map((seatNo) => {
                        const isSelected = selectedSeats.includes(seatNo);
                        return (
                          <Pressable
                            key={`cancel-seat-${seatNo}`}
                            onPress={() => toggleSeatSelection(seatNo)}
                            style={[
                              styles.seatPill,
                              {
                                backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSecondary,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={16}
                              color={isSelected ? colors.primary : colors.textMuted}
                              style={{ marginRight: 6 }}
                            />
                            <AppText
                              variant="bodySmallMedium"
                              style={{ color: isSelected ? colors.primary : colors.text }}
                            >
                              Seat {seatNo}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Live Refund Calculation Breakdown */}
                <View style={{ marginTop: spacing.base }}>
                  <AppText variant="bodySmallMedium" style={{ color: colors.text, marginBottom: 8 }}>
                    Refund Breakdown
                  </AppText>

                  <AppCard variant="outlined" padding="base" style={[styles.calcCard, { borderColor: colors.border }]}>
                    {isChecking ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 8 }}>
                          Fetching operator cancellation policy & refund calculation...
                        </AppText>
                      </View>
                    ) : (
                      <>
                        {isCheckError && (
                          <View style={{ marginBottom: 10, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 6 }}>
                            <AppText variant="caption" style={{ color: colors.danger }}>
                              Live check unavailable. Policy estimate is applied below.
                            </AppText>
                          </View>
                        )}
                        <View style={styles.calcRow}>
                          <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                            Total Paid for Booking
                          </AppText>
                          <AppText variant="bodySmallMedium" style={{ color: colors.text }}>
                            ₹{Number(booking.totalFare).toFixed(2)}
                          </AppText>
                        </View>

                        <View style={[styles.calcRow, { marginTop: 6 }]}>
                          <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                            Cancellation Charges
                          </AppText>
                          <AppText variant="bodySmallMedium" style={{ color: colors.danger }}>
                            -₹{Number(chargeAmount).toFixed(2)}
                          </AppText>
                        </View>

                        <AppDivider spacingMargin="sm" />

                        <View style={styles.calcRow}>
                          <View>
                            <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                              Net Refund Amount
                            </AppText>
                            <AppText variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
                              Instant Credit to AiBus Wallet
                            </AppText>
                          </View>
                          <AppText variant="heading2" style={{ color: colors.success }}>
                            ₹{Number(refundAmount).toFixed(2)}
                          </AppText>
                        </View>
                      </>
                    )}
                  </AppCard>
                </View>

                {/* Wallet Credit Notice */}
                <View style={[styles.walletNoticeBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="wallet-outline" size={20} color="#1D4ED8" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <AppText variant="caption" style={{ color: '#1E40AF', fontWeight: '700' }}>
                      AiBus Wallet Guarantee
                    </AppText>
                    <AppText variant="caption" style={{ color: '#1E3A8A', marginTop: 2, lineHeight: 16 }}>
                      Your refund of ₹{Number(refundAmount).toFixed(2)} will be deposited instantly into your AiBus Wallet as soon as you confirm.
                    </AppText>
                  </View>
                </View>

                {/* Reason Picker */}
                <View style={{ marginTop: spacing.base }}>
                  <AppText variant="bodySmallMedium" style={{ color: colors.text, marginBottom: 8 }}>
                    Reason for Cancellation
                  </AppText>

                  {CANCEL_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        style={[
                          styles.reasonRow,
                          {
                            backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <AppText
                          variant="bodySmall"
                          style={{
                            marginLeft: 10,
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          }}
                        >
                          {reason}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Warning note */}
                <View style={{ marginTop: spacing.base, flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                  <AppText variant="caption" style={{ color: colors.textMuted, marginLeft: 6, flex: 1, lineHeight: 16 }}>
                    Once confirmed, your selected seats will be released immediately and this booking cannot be reinstated.
                  </AppText>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <AppButton
                    title="Keep Ticket"
                    onPress={onClose}
                    variant="outline"
                    size="md"
                    style={{ flex: 1, marginRight: 8 }}
                  />

                  <AppButton
                    title={cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                    onPress={handleConfirmCancellation}
                    variant="danger"
                    size="md"
                    style={{ flex: 1.4, marginLeft: 8 }}
                    disabled={cancelMutation.isPending || (cancellableInfo && !cancellableInfo.IsCancellable)}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  seatPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  calcCard: {
    width: '100%',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletRefundCard: {
    width: '100%',
    marginTop: 20,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
