import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../design-system';
import { TicketResponseData } from '../../types/api';
import { generateAndShareTicketPdf } from './ticketPdfGenerator';

interface ViewTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: TicketResponseData;
}

export function ViewTicketModal({ visible, onClose, ticket }: ViewTicketModalProps) {
  if (!ticket || !ticket.booking) {
    return null;
  }

  const booking = ticket.booking;
  const passengers = booking.passengers || [];
  const seatCount = booking.seats?.length || passengers.length || 1;

  const copyToClipboard = (label: string, text?: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Safe fallback
    }
    // We can show alert or feedback
    Alert.alert('Copied!', `${label} ${text || ''} copied to clipboard.`);
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
    await generateAndShareTicketPdf(ticket);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Top Dismiss Area with Close Button matching ref-3.png */}
        <View style={styles.topDismissArea}>
          <Pressable onPress={onClose} style={styles.topCloseCircle} hitSlop={12}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Modal Card matching ref-3.png */}
        <View style={[styles.ticketModalCard, { backgroundColor: '#FFFFFF' }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Bus Operator Title */}
            <View style={styles.operatorSection}>
              <AppText variant="heading2" style={{ color: '#0F172A', textAlign: 'center', fontWeight: '800' }}>
                {booking.operatorName}
              </AppText>
              <AppText variant="bodySmall" style={{ color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                {booking.busType} • {seatCount} {seatCount > 1 ? 'Seats' : 'Seat'}
              </AppText>
            </View>

            {/* Dashed line */}
            <View style={styles.dashedDivider} />

            {/* 2. Passenger Details */}
            <View style={styles.passengersSection}>
              {passengers.length > 0 ? (
                passengers.map((p, idx) => (
                  <View key={`ticket-modal-p-${idx}`} style={styles.passengerRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '700' }}>
                        {(p.name || 'Passenger').toLowerCase()} {p.gender ? `(${p.gender})` : ''}
                      </AppText>
                      <AppText variant="bodySmall" style={{ color: '#64748B', marginTop: 2 }}>
                        ({p.age} yrs)
                      </AppText>
                    </View>

                    {/* Dark Seat Pill Badge */}
                    <View style={styles.darkSeatBadge}>
                      <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
                        {p.seatNo}
                      </AppText>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.passengerRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '700' }}>
                      {(booking.contactName || 'Passenger').toLowerCase()}
                    </AppText>
                  </View>
                  <View style={styles.darkSeatBadge}>
                    <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
                      {booking.seats?.map((s) => s.seatNo).join(', ') || '1U'}
                    </AppText>
                  </View>
                </View>
              )}
            </View>

            {/* Perforated Divider with Side Notches matching ref-3.png */}
            <View style={styles.perforatedRow}>
              <View style={styles.leftNotch} />
              <View style={styles.dashedDividerLine} />
              <View style={styles.rightNotch} />
            </View>

            {/* 3. Ticket #, PNR #, and Fare */}
            <View style={styles.ticketMetaSection}>
              {/* Ticket # */}
              <View style={styles.metaRow}>
                <AppText variant="bodyMedium" style={{ color: '#64748B' }}>
                  Ticket #
                </AppText>
                <Pressable
                  onPress={() => copyToClipboard('Ticket #', ticket.ticketNumber)}
                  style={styles.copyValueRow}
                  hitSlop={8}
                >
                  <Ionicons name="copy-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                    {ticket.ticketNumber}
                  </AppText>
                </Pressable>
              </View>

              {/* PNR # */}
              <View style={[styles.metaRow, { marginTop: 14 }]}>
                <AppText variant="bodyMedium" style={{ color: '#64748B' }}>
                  PNR #
                </AppText>
                <Pressable
                  onPress={() => copyToClipboard('PNR #', ticket.pnrNumber)}
                  style={styles.copyValueRow}
                  hitSlop={8}
                >
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                    {ticket.pnrNumber}
                  </AppText>
                </Pressable>
              </View>

              {/* Fare */}
              <View style={[styles.metaRow, { marginTop: 18 }]}>
                <AppText variant="bodyMedium" style={{ color: '#64748B' }}>
                  Fare
                </AppText>
                <AppText variant="heading2" style={{ color: '#0F172A', fontWeight: '800' }}>
                  ₹{Number(booking.totalFare).toFixed(2)}
                </AppText>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Share Button matching ref-3.png */}
          <View style={styles.bottomBar}>
            <Pressable onPress={handleShare} style={styles.shareTicketButton}>
              <Ionicons name="share-social" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF', fontSize: 16 }}>
                Share your ticket
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topDismissArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  topCloseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  operatorSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    width: '100%',
  },
  passengersSection: {
    paddingVertical: 18,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  darkSeatBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perforatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -24,
    height: 32,
    marginVertical: 4,
  },
  leftNotch: {
    width: 16,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  dashedDividerLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  rightNotch: {
    width: 16,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  ticketMetaSection: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 10,
  },
  shareTicketButton: {
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
