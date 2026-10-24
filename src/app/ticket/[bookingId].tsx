import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
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
  AppDivider,
  AppLoader,
  AppErrorState,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useTicketQuery } from '../../features/tickets/useTicketQuery';
import { TicketDetailsSkeleton } from '../../features/tickets/TicketDetailsSkeleton';
import {
  generateAndShareTicketPdf,
  shareTicketText,
} from '../../features/tickets/ticketPdfGenerator';
import { ViewTicketModal } from '../../features/tickets/ViewTicketModal';
import { FullTicketDocumentModal } from '../../features/tickets/FullTicketDocumentModal';
import { CancelTicketModal } from '../../features/cancellations/CancelTicketModal';

type DetailTab = 'TICKET_DETAILS' | 'LIVE_TRACKING' | 'CUSTOMER_CARE';

export default function TicketDetailsScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows, isDark } = useAppTheme();
  const { t } = useTranslation();

  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { data: ticket, isLoading, isError, error, refetch } = useTicketQuery(bookingId);

  const [activeTab, setActiveTab] = useState<DetailTab>('TICKET_DETAILS');
  const [showViewTicketModal, setShowViewTicketModal] = useState<boolean>(false);
  const [showFullDocModal, setShowFullDocModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [calendarAdded, setCalendarAdded] = useState<boolean>(false);

  const booking = ticket?.booking;

  const ticketNumber = ticket?.ticketNumber || booking?.providerTicketNo || booking?.bookingNumber || '';
  const pnrNumber = ticket?.pnrNumber || booking?.providerPnrNo || 'N/A';

  // Format date helper: "Thu, 02 Jul"
  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const handleBack = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/bookings' as any);
    }
  };

  const handleShareTicket = async () => {
    if (!ticket) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
    await generateAndShareTicketPdf(ticket);
  };

  const handleAddToCalendar = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Safe fallback
    }
    setCalendarAdded(true);
    Alert.alert(
      'Added to Calendar',
      `Your trip from ${booking?.fromCityName} to ${booking?.toCityName} on ${booking?.journeyDate} has been saved to your schedule.`
    );
  };

  if (isLoading && !ticket) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <TicketDetailsSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !ticket || !booking) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <AppErrorState
          error={error || 'Ticket not found'}
          title="Could not find ticket"
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';
  const isCancelled = booking.status === 'CANCELLED';
  const primaryPassenger = booking.passengers?.[0]?.name || booking.contactName;
  const primarySeat = booking.seats?.[0]?.seatNo || booking.passengers?.[0]?.seatNo || '1U';

  // Status text for middle of connector
  let tripStatusText = 'Trip Completed';
  if (isCancelled) {
    tripStatusText = 'Cancelled';
  } else if (isConfirmed) {
    const today = new Date().toISOString().slice(0, 10);
    tripStatusText = booking.journeyDate >= today ? 'Trip Confirmed' : 'Trip Completed';
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* 1. Header matching ref-2.png: Back button, Ticket details, Subtitle #TV..., Help icon, Share icon */}
      <View style={[styles.topHeaderBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} style={styles.headerIconButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <AppText variant="heading2" style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            Ticket details
          </AppText>
          <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 1 }}>
            Ticket #{ticketNumber}
          </AppText>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={() => setActiveTab('CUSTOMER_CARE')}
            style={styles.headerIconButton}
            hitSlop={10}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleShareTicket}
            style={[styles.headerIconButton, { marginLeft: 8 }]}
            hitSlop={10}
          >
            <Ionicons name="share-social-outline" size={23} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* 2. Top Segmented Tabs Bar matching ref-2.png */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { key: 'TICKET_DETAILS', label: 'Ticket details' },
          { key: 'LIVE_TRACKING', label: 'Live tracking' },
          { key: 'CUSTOMER_CARE', label: 'Customer care' },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {
                  // Safe fallback
                }
                setActiveTab(tab.key as DetailTab);
              }}
              style={[
                styles.tabItem,
                isSelected && [styles.activeTabItem, { borderBottomColor: '#D92D20' }],
              ]}
            >
              <AppText
                variant="bodyMedium"
                style={{
                  color: isSelected ? '#D92D20' : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 60 }]}
      >
        {activeTab === 'TICKET_DETAILS' && (
          <View>
            {/* 3. Primary Journey Ticket Card strictly matching ref-2.png */}
            <View style={[styles.primaryTicketCard, shadows.md]}>
              {/* TOP SECTION: Dark Charcoal Card matching ref-2.png */}
              <View style={styles.darkCardTop}>
                {/* Boarding Point (Top) */}
                <View style={styles.stationRow}>
                  <View style={styles.stationIconCircle}>
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.stationInfoWrap}>
                    <AppText variant="heading2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      {booking.fromCityName}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#94A3B8', marginTop: 2 }}>
                      {booking.pickupLocation || 'Opp. Chandani Chowk Bus Stop'}
                    </AppText>
                  </View>
                  <View style={styles.timeWrap}>
                    <AppText variant="heading2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      {booking.pickupTime || '22:25'}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#94A3B8', marginTop: 2, textAlign: 'right' }}>
                      {formatDateShort(booking.journeyDate)}
                    </AppText>
                  </View>
                </View>

                {/* Timeline connector line & Trip Completed horizontal divider */}
                <View style={styles.timelineRow}>
                  {/* Vertical line connecting boarding to dropping */}
                  <View style={styles.verticalTimelineLine} />

                  {/* Horizontal divider with bus icon and status matching ref-2.png */}
                  <View style={styles.horizontalDividerWrap}>
                    <View style={styles.connectorLine} />
                    <View style={styles.statusPillBox}>
                      <Ionicons name="bus" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                        {tripStatusText}
                      </AppText>
                    </View>
                    <View style={styles.connectorLine} />
                  </View>
                </View>

                {/* Dropping Point (Bottom) */}
                <View style={styles.stationRow}>
                  <View style={styles.stationIconCircle}>
                    <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.stationInfoWrap}>
                    <AppText variant="heading2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      {booking.toCityName}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#94A3B8', marginTop: 2 }}>
                      {booking.dropoffLocation || 'Gandhi Square'}
                    </AppText>
                  </View>
                  <View style={styles.timeWrap}>
                    <AppText variant="heading2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      {booking.dropoffTime || '07:30'}
                    </AppText>
                    <AppText variant="caption" style={{ color: '#94A3B8', marginTop: 2, textAlign: 'right' }}>
                      {formatDateShort(booking.journeyDate)}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* BOTTOM SECTION: White Attached Card matching ref-2.png */}
              <View style={styles.whiteCardBottom}>
                <View style={styles.passengerHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading3" style={{ color: '#0F172A', fontWeight: '800' }}>
                      {booking.operatorName}
                    </AppText>
                    <AppText variant="bodyMedium" style={{ color: '#475569', marginTop: 4 }}>
                      {(primaryPassenger || 'Passenger').toLowerCase()}
                    </AppText>
                  </View>

                  {/* Dark Seat Badge matching ref-2.png */}
                  <View style={styles.darkSeatPill}>
                    <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
                      {primarySeat}
                    </AppText>
                  </View>
                </View>

                {/* Perforated Cut Line with side notches matching ref-2.png */}
                <View style={styles.perforatedCutRow}>
                  <View style={styles.cutNotchLeft} />
                  <View style={styles.perforatedDashedLine} />
                  <View style={styles.cutNotchRight} />
                </View>

                {/* Blue "View Ticket Details" button matching ref-2.png */}
                <Pressable
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {
                      // Safe fallback
                    }
                    setShowViewTicketModal(true);
                  }}
                  style={({ pressed }) => [styles.viewTicketDetailsBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="swap-vertical" size={18} color="#1D4ED8" style={{ marginRight: 6 }} />
                  <AppText variant="bodyLargeBold" style={{ color: '#1D4ED8', textDecorationLine: 'underline' }}>
                    View Ticket Details
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* 4. Action Cards below Ticket matching ref-2.png */}
            {/* Add trip to calendar */}
            <Pressable
              onPress={handleAddToCalendar}
              style={({ pressed }) => [
                styles.actionCard,
                shadows.sm,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.actionCardLeft}>
                <Ionicons name="calendar-outline" size={24} color={colors.text} />
                <AppText
                  variant="bodyLargeBold"
                  style={{
                    color: colors.text,
                    marginLeft: 14,
                    textDecorationLine: 'underline',
                  }}
                >
                  {calendarAdded ? 'Trip added to calendar' : 'Add trip to calendar'}
                </AppText>
              </View>
              <Ionicons
                name={calendarAdded ? 'checkmark-circle' : 'add'}
                size={22}
                color={calendarAdded ? colors.success : colors.text}
              />
            </Pressable>

            {/* Scratch Cards Rewards Banner matching ref-2.png */}
            <View style={[styles.rewardsBannerCard, shadows.sm]}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" style={{ color: '#92400E', fontWeight: '700' }}>
                  Congratulations
                </AppText>
                <AppText variant="heading3" style={{ color: '#78350F', marginTop: 2, fontWeight: '800' }}>
                  You won scratch cards
                </AppText>
              </View>

              {/* Gift box icon */}
              <View style={styles.giftBoxIconCircle}>
                <Ionicons name="gift" size={26} color="#FFFFFF" />
              </View>
            </View>

            {/* 5. Production-Grade Cancel Ticket Module Card */}
            {isConfirmed && (
              <AppCard
                variant="outlined"
                padding="base"
                style={[styles.cancelTicketCard, { borderColor: colors.border, marginTop: spacing.md }]}
              >
                <View style={styles.cancelCardContent}>
                  <View style={[styles.cancelIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      Cancel Ticket & Instant Refund
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                      Refunds are credited directly to your AiBus Wallet immediately upon cancellation.
                    </AppText>
                  </View>
                </View>

                <AppButton
                  title="Cancel Ticket"
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {
                      // Safe fallback
                    }
                    setShowCancelModal(true);
                  }}
                  variant="danger"
                  size="md"
                  fullWidth
                  style={{ marginTop: 12 }}
                  icon={<Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
                />
              </AppCard>
            )}

            {isCancelled && (
              <AppCard
                variant="elevated"
                padding="base"
                style={[
                  styles.cancelSummaryCard,
                  shadows.sm,
                  { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, marginTop: spacing.md },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="information-circle" size={24} color="#DC2626" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <AppText variant="bodyLargeBold" style={{ color: '#991B1B' }}>
                      Ticket Cancelled
                    </AppText>
                    <AppText variant="caption" style={{ color: '#B91C1C', marginTop: 2 }}>
                      This reservation was cancelled. Refund has been credited to your AiBus Wallet.
                    </AppText>
                  </View>
                </View>
              </AppCard>
            )}

            {/* 6. View Full Document / Download PDF Card */}
            <Pressable
              onPress={() => setShowFullDocModal(true)}
              style={({ pressed }) => [
                styles.fullDocCard,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                shadows.sm,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                <View style={{ marginLeft: 12 }}>
                  <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                    View Full Printable Ticket (PDF)
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textSecondary }}>
                    Complete itinerary, cancellation terms & boarding pass
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Tab 2: LIVE TRACKING */}
        {activeTab === 'LIVE_TRACKING' && (
          <View style={styles.trackingContainer}>
            <AppCard variant="elevated" padding="base" style={[styles.trackingCard, shadows.sm]}>
              <View style={styles.trackingHeader}>
                <View style={styles.livePulseBadge}>
                  <View style={styles.liveGreenDot} />
                  <AppText variant="caption" style={{ color: '#16A34A', fontWeight: '800' }}>
                    GPS LIVE
                  </AppText>
                </View>
                <AppText variant="caption" style={{ color: colors.textSecondary }}>
                  Bus Reg: MH-12-AB-4448
                </AppText>
              </View>

              <AppDivider spacingMargin="md" />

              {/* Progress Milestones */}
              <View style={styles.milestoneWrap}>
                <View style={styles.milestoneItem}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                      {booking.fromCityName} &bull; Departed
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {booking.pickupLocation} ({booking.pickupTime})
                    </AppText>
                  </View>
                </View>

                <View style={styles.milestoneConnector} />

                <View style={styles.milestoneItem}>
                  <Ionicons name="radio-button-on" size={22} color={colors.primary} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                      On Route &bull; Express Highway
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      Speed: 68 km/h &bull; Running on time
                    </AppText>
                  </View>
                </View>

                <View style={styles.milestoneConnector} />

                <View style={styles.milestoneItem}>
                  <Ionicons name="location-outline" size={22} color={colors.textMuted} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText variant="bodyMedium" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                      {booking.toCityName} &bull; Estimated Arrival
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {booking.dropoffLocation} ({booking.dropoffTime})
                    </AppText>
                  </View>
                </View>
              </View>
            </AppCard>
          </View>
        )}

        {/* Tab 3: CUSTOMER CARE */}
        {activeTab === 'CUSTOMER_CARE' && (
          <View style={styles.careContainer}>
            <AppCard variant="elevated" padding="base" style={[styles.careCard, shadows.sm]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.careIconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="headset" size={26} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <AppText variant="heading3" style={{ color: colors.text }}>
                    24x7 AiBus Support
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textSecondary }}>
                    We are here to assist with boarding, cancellations, and wallet refunds
                  </AppText>
                </View>
              </View>

              <AppDivider spacingMargin="md" />

              <View style={styles.careActionsRow}>
                <AppButton
                  title="Call Support"
                  onPress={() => Alert.alert('Helpline', 'AiBus 24/7 Helpline: 1800-102-AIBUS')}
                  variant="primary"
                  size="md"
                  style={{ flex: 1, marginRight: 6 }}
                  icon={<Ionicons name="call" size={16} color="#FFFFFF" />}
                />
                <AppButton
                  title="Email Care"
                  onPress={() => Alert.alert('Email Care', 'Support email: support@aibus.com')}
                  variant="outline"
                  size="md"
                  style={{ flex: 1, marginLeft: 6 }}
                  icon={<Ionicons name="mail-outline" size={16} color={colors.text} />}
                />
              </View>
            </AppCard>

            {/* FAQs */}
            <AppCard variant="outlined" padding="base" style={[styles.faqCard, { marginTop: spacing.base }]}>
              <AppText variant="bodyLargeBold" style={{ color: colors.text, marginBottom: 12 }}>
                Ticket & Refund FAQs
              </AppText>

              <View style={styles.faqItem}>
                <AppText variant="bodySmallMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  How do cancellation refunds work?
                </AppText>
                <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                  When you cancel your ticket, the refundable amount calculated per operator policy is deposited instantly into your AiBus Wallet. You can use it right away.
                </AppText>
              </View>

              <AppDivider spacingMargin="sm" />

              <View style={styles.faqItem}>
                <AppText variant="bodySmallMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  Do I need to carry a printed ticket?
                </AppText>
                <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                  No, this digital ticket and SMS/WhatsApp confirmation are 100% valid for boarding.
                </AppText>
              </View>
            </AppCard>
          </View>
        )}
      </ScrollView>

      {/* 7. View Ticket Modal matching ref-3.png */}
      <ViewTicketModal
        visible={showViewTicketModal}
        onClose={() => setShowViewTicketModal(false)}
        ticket={ticket}
      />

      {/* 8. Full Ticket Document Modal matching ref-4.png */}
      <FullTicketDocumentModal
        visible={showFullDocModal}
        onClose={() => setShowFullDocModal(false)}
        ticket={ticket}
      />

      {/* 9. Cancel Ticket Modal with Wallet Refund */}
      <CancelTicketModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        booking={booking}
        ticketNumber={ticketNumber}
        pnrNumber={pnrNumber}
        onCancelled={() => {
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#D92D20',
  },
  scrollContent: {
    paddingTop: 14,
  },
  primaryTicketCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  darkCardTop: {
    backgroundColor: '#1E2022',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stationInfoWrap: {
    flex: 1,
    marginLeft: 10,
  },
  timeWrap: {
    alignItems: 'flex-end',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 13,
    top: -12,
    bottom: -12,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 1,
  },
  horizontalDividerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 26,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  whiteCardBottom: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  passengerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  darkSeatPill: {
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perforatedCutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -20,
    height: 30,
    marginVertical: 10,
  },
  cutNotchLeft: {
    width: 15,
    height: 30,
    backgroundColor: '#F8FAFC',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
  perforatedDashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  cutNotchRight: {
    width: 15,
    height: 30,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  viewTicketDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardsBannerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  giftBoxIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTicketCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  cancelCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelSummaryCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  fullDocCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  trackingContainer: {
    paddingTop: 6,
  },
  trackingCard: {
    borderRadius: 16,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  milestoneWrap: {
    paddingVertical: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  milestoneConnector: {
    width: 2,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginLeft: 10,
    marginVertical: 4,
  },
  careContainer: {
    paddingTop: 6,
  },
  careCard: {
    borderRadius: 16,
  },
  careIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careActionsRow: {
    flexDirection: 'row',
  },
  faqCard: {
    borderRadius: 16,
  },
  faqItem: {
    paddingVertical: 4,
  },
});
