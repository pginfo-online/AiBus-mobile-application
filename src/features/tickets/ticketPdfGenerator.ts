import { Share, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { TicketResponseData } from '../../types/api';
import { buildTicketHtml } from './ticketHtmlTemplate';

export * from './ticketHtmlTemplate';

/**
 * Generate PDF file for ticket and share via native dialog
 */
export async function generateAndShareTicketPdf(ticket: TicketResponseData): Promise<void> {
  try {
    const html = buildTicketHtml(ticket);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `AiBus Ticket - ${ticket.ticketNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: share text
      await shareTicketText(ticket);
    }
  } catch {
    // If PDF fails, attempt plain text share
    try {
      await shareTicketText(ticket);
    } catch {
      Alert.alert('Share Failed', 'Unable to share ticket. Please check app permissions.');
    }
  }
}

/**
 * Share ticket as rich text representation
 */
export async function shareTicketText(ticket: TicketResponseData): Promise<void> {
  const b = ticket.booking;
  const seats = b.seats?.map((s) => s.seatNo).join(', ') || 'N/A';
  const text = [
    `*AiBus Confirmed Bus Ticket*`,
    `PNR: ${ticket.pnrNumber}`,
    `Ticket #: ${ticket.ticketNumber}`,
    `Operator: ${b.operatorName}`,
    `Bus: ${b.busType}`,
    `Route: ${b.fromCityName} ➔ ${b.toCityName}`,
    `Journey Date: ${b.journeyDate}`,
    `Boarding: ${b.pickupLocation || b.fromCityName} (${b.pickupTime})`,
    `Dropping: ${b.dropoffLocation || b.toCityName} (${b.dropoffTime})`,
    `Seats: ${seats}`,
    `Total Fare: ₹${b.totalFare}`,
    `Status: ${ticket.status}`,
    `\nBook your bus tickets conveniently on AiBus!`,
  ].join('\n');

  await Share.share({
    title: `AiBus Ticket #${ticket.ticketNumber}`,
    message: text,
  });
}
