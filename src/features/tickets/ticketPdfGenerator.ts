import type { SupportedLanguage } from "../../core/localization/translations";
import { Share, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { TicketResponseData } from "../../types/api";
import { buildTicketHtml } from "./ticketHtmlTemplate";
import { translations } from "../../core/localization/translations";
import { bookingPhase } from "../booking/bookingLifecycle";

export * from "./ticketHtmlTemplate";

/**
 * Generate PDF file for ticket and share via native dialog
 */
export async function generateAndShareTicketPdf(
  ticket: TicketResponseData,
  language: SupportedLanguage = "en",
): Promise<void> {
  try {
    const html = buildTicketHtml(ticket, language);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `AiBus — ${translations[language]['ticket.share']}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      // Fallback: share text
      await shareTicketText(ticket, language);
    }
  } catch {
    // If PDF fails, attempt plain text share
    try {
      await shareTicketText(ticket, language);
    } catch {
      Alert.alert(
        translations[language]['ticket.share'],
        translations[language]['flow.share_error'],
      );
    }
  }
}

/**
 * Share ticket as rich text representation
 */
export async function shareTicketText(
  ticket: TicketResponseData,
  language: SupportedLanguage = "en",
): Promise<void> {
  const b = ticket.booking;
  const t = (key: string) => translations[language][key] || translations.en[key] || key;
  const seats = b.seats?.map((s) => `${s.seatNo}${s.cancelledAt ? ` (${t('flow.cancelled')})` : ''}`).join(", ") || "—";
  const text = [
    `*AiBus*`,
    `${t('ticket.pnr')}: ${ticket.pnrNumber || '—'}`,
    `${t('flow.ticket_number')}: ${ticket.ticketNumber || '—'}`,
    `${t('flow.travels')}: ${b.operatorName}`,
    `${t('pax.bus')}: ${b.busType}`,
    `${b.fromCityName} ➔ ${b.toCityName}`,
    `${t('flow.departure')}: ${b.journeyDate} ${b.pickupTime || ''}`,
    `${t('pax.pickup')}: ${b.pickupLocation || '—'}`,
    `${t('pax.drop')}: ${b.dropoffLocation || '—'} ${b.dropoffTime || ''}`,
    `${t('pax.seats')}: ${seats}`,
    `${t('pax.amount')}: ₹${b.totalFare}`,
    `${t('flow.status')}: ${t(`flow.${bookingPhase(b.status || ticket.status)}`)}`,
  ].join("\n");

  await Share.share({
    title: `AiBus — ${t('flow.trip_details')}`,
    message: text,
  });
}
