import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
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

export default function TicketDetailsScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const { data: ticket, isLoading, isError, error, refetch } = useTicketQuery(bookingId);

  const booking = ticket?.booking;

  const handleShareTicket = async () => {
    if (!ticket) return;

    try {
      const shareText = `*AiBus Ticket Confirmation*\nPNR: ${ticket.pnrNumber}\nTicket No: ${
        ticket.ticketNumber
      }\nRoute: ${booking?.fromCityName} to ${booking?.toCityName}\nOperator: ${
        booking?.operatorName
      }\nDate: ${booking?.journeyDate}\nSeats: ${booking?.seats
        ?.map((s) => s.seatNo)
        .join(', ')}\nBoarding: ${booking?.pickupLocation} at ${booking?.pickupTime}`;

      // If Print is available, generate PDF, else native share
      const { uri } = await Print.printToFileAsync({
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 24px;">
              <h1 style="color: #D92D20;">AiBus - Confirmed Bus Ticket</h1>
              <hr/>
              <p><strong>PNR:</strong> ${ticket.pnrNumber}</p>
              <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
              <p><strong>Operator:</strong> ${booking?.operatorName}</p>
              <p><strong>Journey:</strong> ${booking?.fromCityName} &rarr; ${booking?.toCityName}</p>
              <p><strong>Date:</strong> ${booking?.journeyDate}</p>
              <p><strong>Pickup:</strong> ${booking?.pickupLocation} (${booking?.pickupTime})</p>
              <p><strong>Dropoff:</strong> ${booking?.dropoffLocation} (${booking?.dropoffTime})</p>
              <p><strong>Seats:</strong> ${booking?.seats?.map((s) => s.seatNo).join(', ')}</p>
              <p><strong>Total Fare:</strong> &#8377;${booking?.totalFare}</p>
            </body>
          </html>
        `,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Bus Ticket',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'File sharing is not supported on this platform.');
      }
    } catch {
      Alert.alert('Share Failed', 'Unable to generate ticket file for sharing.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <AppLoader message="Retrieving your ticket details..." />
      </SafeAreaView>
    );
  }

  if (isError || !ticket || !booking) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <AppErrorState
          error={error || 'Ticket not found'}
          title="Could not find ticket"
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 110 }]}
      >
        {/* 1. Confirmation Banner */}
        <View style={styles.successBanner}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <AppText variant="heading2" style={{ color: colors.text, marginTop: spacing.md }}>
            {t('ticket.title')}
          </AppText>
          <AppText variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
            Your booking reference has been confirmed by the operator
          </AppText>
        </View>

        {/* 2. Primary Ticket Card */}
        <AppCard variant="elevated" padding="base" style={[styles.ticketCard, shadows.md]}>
          {/* Header PNR & Ticket Info */}
          <View style={styles.ticketHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('ticket.pnr')}
              </AppText>
              <AppText variant="heading3" style={{ color: colors.primary, marginTop: 1 }}>
                {ticket.pnrNumber}
              </AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('ticket.ticket_no')}
              </AppText>
              <AppText variant="bodyLargeBold" style={{ color: colors.text, marginTop: 1 }}>
                {ticket.ticketNumber}
              </AppText>
            </View>
          </View>

          <AppDivider spacingMargin="md" />

          {/* Route & Operator */}
          <View style={{ marginBottom: spacing.md }}>
            <AppText variant="heading3" style={{ color: colors.text }}>
              {booking.fromCityName} → {booking.toCityName}
            </AppText>
            <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
              {booking.operatorName} • {booking.busType}
            </AppText>
            <AppText variant="caption" style={{ color: colors.primary, marginTop: 2, fontWeight: '600' }}>
              Journey Date: {booking.journeyDate}
            </AppText>
          </View>

          {/* Pickup & Dropoff Box */}
          <View style={[styles.pointsBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
            <View style={styles.pointRow}>
              <Ionicons name="radio-button-on" size={16} color={colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  {booking.pickupTime} — {booking.pickupLocation}
                </AppText>
              </View>
            </View>

            <View style={[styles.pointRow, { marginTop: 8 }]}>
              <Ionicons name="location" size={16} color={colors.danger} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '700' }}>
                  {booking.dropoffTime} — {booking.dropoffLocation}
                </AppText>
              </View>
            </View>
          </View>

          {/* Passengers & Seats */}
          <View style={{ marginTop: spacing.md }}>
            <AppText variant="bodySmallMedium" style={{ color: colors.textSecondary, marginBottom: 6 }}>
              Passengers & Seats
            </AppText>
            {booking.passengers?.map((p, idx) => (
              <View key={`ticket-p-${idx}`} style={styles.passengerLine}>
                <AppText variant="bodyMedium" style={{ color: colors.text }}>
                  {p.name} ({p.gender === 'M' ? 'M' : 'F'}, {p.age}y)
                </AppText>
                <AppBadge label={`Seat ${p.seatNo}`} variant="primary" size="sm" />
              </View>
            ))}
          </View>

          <AppDivider spacingMargin="md" />

          {/* Total Fare Paid */}
          <View style={styles.fareLine}>
            <AppText variant="bodyMedium" style={{ color: colors.textSecondary }}>
              Total Paid
            </AppText>
            <AppText variant="priceLarge" style={{ color: colors.primary }}>
              ₹{booking.totalFare}
            </AppText>
          </View>
        </AppCard>

        {/* 3. Action Buttons */}
        <View style={styles.actionRow}>
          <AppButton
            title={t('ticket.share')}
            onPress={handleShareTicket}
            variant="outline"
            size="md"
            style={{ flex: 1, marginRight: 8 }}
            icon={<Ionicons name="share-social-outline" size={18} color={colors.text} />}
          />

          <AppButton
            title={t('ticket.view_home')}
            onPress={() => router.replace('/(tabs)/home' as any)}
            variant="primary"
            size="md"
            style={{ flex: 1, marginLeft: 8 }}
            icon={<Ionicons name="home-outline" size={18} color="#FFFFFF" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  successBanner: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketCard: {
    width: '100%',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsBox: {
    padding: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
