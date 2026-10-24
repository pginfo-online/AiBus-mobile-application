import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';
import { AppText, AppButton } from '../../design-system';
import { TicketResponseData } from '../../types/api';
import { generateAndShareTicketPdf } from './ticketPdfGenerator';

interface FullTicketDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: TicketResponseData;
}

export function FullTicketDocumentModal({ visible, onClose, ticket }: FullTicketDocumentModalProps) {
  const { colors, spacing, radii, shadows } = useAppTheme();
  if (!ticket || !ticket.booking) {
    return null;
  }
  const booking = ticket.booking;

  const passengers = booking.passengers || [];
  const primaryName = passengers[0]?.name || booking.contactName || 'Passenger';

  const handleShare = async () => {
    await generateAndShareTicketPdf(ticket);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Bar */}
        <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <AppText variant="heading3" style={{ color: colors.text, flex: 1, marginLeft: 12 }}>
            AiBus Ticket Document
          </AppText>
          <Pressable onPress={handleShare} style={styles.shareButton} hitSlop={10}>
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 40 }]}
        >
          {/* Ticket Information Card matching ref-4.png */}
          <View style={[styles.ticketDocWrap, shadows.md, { backgroundColor: '#FFFFFF', borderRadius: radii.lg }]}>
            {/* Red Top Header */}
            <View style={styles.docHeaderBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.busIconCircle}>
                  <Ionicons name="bus" size={20} color="#D92D20" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF', fontSize: 17 }}>
                    AiBus &bull; Ticket Information
                  </AppText>
                  <AppText variant="caption" style={{ color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 }}>
                    {booking.fromCityName} - {booking.toCityName} on {booking.journeyDate}
                  </AppText>
                </View>
              </View>

              <View style={styles.docMetaRow}>
                <AppText variant="caption" style={{ color: '#FFFFFF' }}>
                  Ticket Number: <AppText variant="bodySmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>{ticket.ticketNumber}</AppText>
                </AppText>
                <AppText variant="caption" style={{ color: '#FFFFFF' }}>
                  PNR No: <AppText variant="bodySmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>{ticket.pnrNumber}</AppText>
                </AppText>
              </View>
            </View>

            {/* Document Body */}
            <View style={styles.docBody}>
              {/* Greeting */}
              <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                Hey {primaryName},
              </AppText>

              <AppText variant="bodySmallMedium" style={{ color: '#16A34A', marginTop: 4, fontWeight: '700' }}>
                Hurray!! You have earned cashback on this booking with AiBus
              </AppText>

              {/* Eco Banner matching ref-4.png */}
              <View style={styles.ecoGreenBanner}>
                <Ionicons name="leaf" size={20} color="#059669" style={{ marginTop: 2 }} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <AppText variant="bodySmall" style={{ color: '#065F46', fontWeight: '700' }}>
                    Save paper, save environment
                  </AppText>
                  <AppText variant="caption" style={{ color: '#047857', marginTop: 2, lineHeight: 16 }}>
                    AiBus Users save on average 450 trees every month by not printing the ticket.
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" style={{ color: '#64748B', marginTop: 8 }}>
                Cashback of ₹72.0 will be credited to your AiBus wallet post journey
              </AppText>

              {/* Ticket Details Subheader */}
              <View style={styles.subHeaderBox}>
                <AppText variant="bodySmall" style={{ color: '#1E293B', fontWeight: '700' }}>
                  Ticket Details
                </AppText>
              </View>

              {/* Journey Date and Time */}
              <View style={styles.fieldBlock}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Journey Date and Time
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={16} color="#D92D20" style={{ marginRight: 6 }} />
                  <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                    {booking.journeyDate}, {booking.pickupTime || '22:25'}
                  </AppText>
                </View>
              </View>

              {/* Travels */}
              <View style={[styles.fieldBlock, { marginTop: 12 }]}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Travels
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="bus-outline" size={16} color="#D92D20" style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                      {booking.operatorName}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#64748B' }}>
                      {booking.busType}
                    </AppText>
                    {booking.contactPhone ? (
                      <AppText variant="caption" style={{ color: '#2563EB', marginTop: 2, fontWeight: '600' }}>
                        {booking.contactPhone}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Ticket Price */}
              <View style={[styles.fieldBlock, { marginTop: 12 }]}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Ticket Price
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="pricetag-outline" size={16} color="#D92D20" style={{ marginRight: 6 }} />
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A' }}>
                    Rs. {Number(booking.totalFare).toFixed(2)}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#64748B', marginLeft: 8 }}>
                    (Inclusive of GST)
                  </AppText>
                </View>
              </View>

              {/* Boarding Point */}
              <View style={[styles.fieldBlock, { marginTop: 12 }]}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Boarding Point
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                  <Ionicons name="location-outline" size={16} color="#D92D20" style={{ marginRight: 6, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                      {booking.fromCityName}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#475569', marginTop: 2 }}>
                      {booking.pickupLocation || 'Main Bus Stand'}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
                      Reporting Time: {booking.pickupTime || '22:25'}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Dropping Point */}
              <View style={[styles.fieldBlock, { marginTop: 12 }]}>
                <AppText variant="caption" style={{ color: '#64748B' }}>
                  Dropping Point
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                  <Ionicons name="location" size={16} color="#DC2626" style={{ marginRight: 6, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: '#0F172A', fontWeight: '700' }}>
                      {booking.toCityName}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#475569', marginTop: 2 }}>
                      {booking.dropoffLocation || 'Gandhi Square / Main Stand'}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
                      Dropping Time: {booking.dropoffTime || '07:30'}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Passenger Details Table */}
              <View style={[styles.subHeaderBox, { marginTop: 16 }]}>
                <AppText variant="bodySmall" style={{ color: '#1E293B', fontWeight: '700' }}>
                  Passenger Details
                </AppText>
              </View>

              <View style={styles.tableHeaderRow}>
                <AppText variant="caption" style={{ color: '#64748B', flex: 1, fontWeight: '700' }}>
                  Passenger Name
                </AppText>
                <AppText variant="caption" style={{ color: '#64748B', width: 80, textAlign: 'right', fontWeight: '700' }}>
                  Seat No
                </AppText>
              </View>

              {passengers.length > 0 ? (
                passengers.map((p, idx) => (
                  <View key={`doc-p-${idx}`} style={styles.tableRow}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySmallMedium" style={{ color: '#0F172A' }}>
                        {p.name}
                      </AppText>
                      <AppText variant="caption" style={{ color: '#64748B' }}>
                        {p.age} Yrs, {p.gender === 'M' ? 'MALE' : 'FEMALE'}
                      </AppText>
                    </View>
                    <AppText variant="bodyLargeBold" style={{ color: '#0F172A', width: 80, textAlign: 'right' }}>
                      {p.seatNo}
                    </AppText>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <AppText variant="bodySmallMedium" style={{ color: '#0F172A', flex: 1 }}>
                    {booking.contactName}
                  </AppText>
                  <AppText variant="bodyLargeBold" style={{ color: '#0F172A', width: 80, textAlign: 'right' }}>
                    {booking.seats?.map((s) => s.seatNo).join(', ') || '1U'}
                  </AppText>
                </View>
              )}

              {/* Cancellation Policy Table matching ref-4.png */}
              <View style={[styles.subHeaderBox, { marginTop: 20 }]}>
                <AppText variant="bodySmall" style={{ color: '#1E293B', fontWeight: '700' }}>
                  Cancellation Policy
                </AppText>
              </View>

              <View style={styles.tableHeaderRow}>
                <AppText variant="caption" style={{ color: '#64748B', flex: 1, fontWeight: '700' }}>
                  Cancellation Time
                </AppText>
                <AppText variant="caption" style={{ color: '#64748B', width: 110, textAlign: 'right', fontWeight: '700' }}>
                  Deduction
                </AppText>
              </View>

              <View style={styles.policyRow}>
                <AppText variant="caption" style={{ color: '#334155', flex: 1 }}>
                  Before 24 hours of bus departure
                </AppText>
                <AppText variant="caption" style={{ color: '#0F172A', fontWeight: '700', width: 110, textAlign: 'right' }}>
                  10% deduction
                </AppText>
              </View>

              <View style={styles.policyRow}>
                <AppText variant="caption" style={{ color: '#334155', flex: 1 }}>
                  Between 12 to 24 hrs before departure
                </AppText>
                <AppText variant="caption" style={{ color: '#0F172A', fontWeight: '700', width: 110, textAlign: 'right' }}>
                  25% deduction
                </AppText>
              </View>

              <View style={styles.policyRow}>
                <AppText variant="caption" style={{ color: '#334155', flex: 1 }}>
                  Between 2 to 12 hrs before departure
                </AppText>
                <AppText variant="caption" style={{ color: '#0F172A', fontWeight: '700', width: 110, textAlign: 'right' }}>
                  50% deduction
                </AppText>
              </View>

              <View style={styles.policyRow}>
                <AppText variant="caption" style={{ color: '#334155', flex: 1 }}>
                  Less than 2 hrs before departure
                </AppText>
                <AppText variant="caption" style={{ color: '#DC2626', fontWeight: '700', width: 110, textAlign: 'right' }}>
                  No Refund (100%)
                </AppText>
              </View>

              <View style={styles.walletRefundInfoBox}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <AppText variant="caption" style={{ color: '#15803D', marginLeft: 6, flex: 1, fontWeight: '600' }}>
                  Cancellation refunds are credited directly & instantly to your AiBus Wallet.
                </AppText>
              </View>
            </View>
          </View>

          {/* Action Button: Share / Download PDF */}
          <AppButton
            title="Share / Save PDF Ticket"
            onPress={handleShare}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: spacing.base }}
            icon={<Ionicons name="share-social" size={20} color="#FFFFFF" />}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  shareButton: {
    padding: 6,
  },
  scrollContent: {
    paddingTop: 12,
  },
  ticketDocWrap: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docHeaderBanner: {
    backgroundColor: '#D92D20',
    padding: 16,
  },
  busIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  docBody: {
    padding: 16,
  },
  ecoGreenBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  subHeaderBox: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  fieldBlock: {
    paddingVertical: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  walletRefundInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
  },
});
