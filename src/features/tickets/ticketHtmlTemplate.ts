import type { TicketResponseData } from '../../types/api';

/**
 * Format date for ticket header: "Thursday, July 2, 2026"
 */
export function formatTicketDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function escapeHtml(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate production HTML template strictly inspired by ref-4.png
 */
export function buildTicketHtml(ticket: TicketResponseData): string {
  const booking = ticket.booking;
  const journeyDateFormatted = formatTicketDate(booking.journeyDate);
  const primaryPassengerName =
    booking.passengers?.[0]?.name || booking.contactName || 'Valued Passenger';

  const passengersRows = (booking.passengers || []).map((p) => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #1E293B;">
        <strong>${escapeHtml(p.name)}</strong><br/>
        <span style="font-size: 11px; color: #64748B;">${p.age} Yrs, ${p.gender === 'M' ? 'MALE' : 'FEMALE'}</span>
      </td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: bold; color: #D92D20; text-align: right;">
        ${escapeHtml(p.seatNo)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>AiBus Ticket - ${escapeHtml(ticket.ticketNumber)}</title>
        <style>
          @page { margin: 16mm; size: auto; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 0;
            background-color: #FFFFFF;
          }
          .header-banner {
            background: linear-gradient(135deg, #D92D20 0%, #B42318 100%);
            color: #FFFFFF;
            padding: 24px;
            border-radius: 12px 12px 0 0;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin: 0 0 6px 0;
            display: flex;
            align-items: center;
          }
          .route-header {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 10px 0;
            opacity: 0.95;
          }
          .ticket-meta {
            font-size: 12px;
            opacity: 0.9;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.25);
          }
          .content-wrap {
            padding: 20px 24px;
            border: 1px solid #E2E8F0;
            border-top: none;
            border-radius: 0 0 12px 12px;
          }
          .greeting {
            font-size: 15px;
            font-weight: 600;
            color: #0F172A;
            margin: 0 0 8px 0;
          }
          .cashback-badge {
            color: #16A34A;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .eco-box {
            background-color: #ECFDF5;
            border: 1px solid #A7F3D0;
            color: #065F46;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            margin-bottom: 20px;
            line-height: 1.5;
          }
          .section-title {
            background-color: #F1F5F9;
            color: #334155;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 6px;
            margin-top: 20px;
            margin-bottom: 14px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }
          .detail-item {
            font-size: 13px;
          }
          .detail-label {
            font-size: 11px;
            color: #64748B;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 3px;
          }
          .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #0F172A;
          }
          .detail-sub {
            font-size: 12px;
            color: #475569;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background-color: #F8FAFC;
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            text-align: left;
            border-bottom: 2px solid #E2E8F0;
          }
          .policy-table td {
            padding: 8px 12px;
            font-size: 12px;
            border-bottom: 1px solid #F1F5F9;
          }
          .footer-note {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed #CBD5E1;
            font-size: 11px;
            color: #94A3B8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="brand-title">AiBus — Ticket Information</div>
          <div class="route-header">${escapeHtml(booking.fromCityName)} to ${escapeHtml(booking.toCityName)} on ${escapeHtml(journeyDateFormatted)}</div>
          <div class="ticket-meta">
            Ticket Number: <strong>${escapeHtml(ticket.ticketNumber)}</strong> &nbsp;|&nbsp; PNR No: <strong>${escapeHtml(ticket.pnrNumber)}</strong>
          </div>
        </div>

        <div class="content-wrap">
          <div class="greeting">Hey ${escapeHtml(primaryPassengerName)},</div>
          <div class="cashback-badge">Hurray!! You have earned cashback on this booking with AiBus!</div>

          <div class="eco-box">
            🌱 <strong>Save paper, save environment</strong><br/>
            AiBus users save an average of 450 trees every month by not printing physical paper tickets. This digital ticket on your mobile device is 100% valid for boarding.
          </div>

          <div class="section-title">Ticket Details</div>

          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">Journey Date & Time</div>
              <div class="detail-value">${escapeHtml(booking.journeyDate)} • ${escapeHtml(booking.pickupTime || '')}</div>
            </div>

            <div class="detail-item">
              <div class="detail-label">Travels / Bus Operator</div>
              <div class="detail-value">${escapeHtml(booking.operatorName)}</div>
              <div class="detail-sub">${escapeHtml(booking.busType)}</div>
            </div>

            <div class="detail-item">
              <div class="detail-label">Boarding Point</div>
              <div class="detail-value">${escapeHtml(booking.fromCityName)}</div>
              <div class="detail-sub">${escapeHtml(booking.pickupLocation || 'Main Boarding Point')}</div>
              <div class="detail-sub">Reporting Time: ${escapeHtml(booking.pickupTime || '')}</div>
            </div>

            <div class="detail-item">
              <div class="detail-label">Dropping Point</div>
              <div class="detail-value">${escapeHtml(booking.toCityName)}</div>
              <div class="detail-sub">${escapeHtml(booking.dropoffLocation || 'Main Dropping Point')}</div>
              <div class="detail-sub">Arrival Time: ${escapeHtml(booking.dropoffTime || '')}</div>
            </div>

            <div class="detail-item">
              <div class="detail-label">Total Fare Paid</div>
              <div class="detail-value" style="color: #D92D20;">₹${Number(booking.totalFare).toFixed(2)}</div>
              <div class="detail-sub">(Inclusive of all taxes & operator charges)</div>
            </div>

            <div class="detail-item">
              <div class="detail-label">Passenger Contact</div>
              <div class="detail-value">${escapeHtml(booking.contactName)}</div>
              <div class="detail-sub">${escapeHtml(booking.contactPhone)} • ${escapeHtml(booking.contactEmail)}</div>
            </div>
          </div>

          <div class="section-title">Passenger Details</div>
          <table>
            <thead>
              <tr>
                <th>Passenger Name</th>
                <th style="text-align: right;">Seat No</th>
              </tr>
            </thead>
            <tbody>
              ${passengersRows}
            </tbody>
          </table>

          <div class="section-title">Cancellation Policy</div>
          <table class="policy-table">
            <thead>
              <tr>
                <th>Cancellation Time</th>
                <th style="text-align: right;">Cancellation Charges</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Before 24 hours of bus departure</td>
                <td style="text-align: right; font-weight: 600;">10% deduction</td>
              </tr>
              <tr>
                <td>Between 12 to 24 hours before departure</td>
                <td style="text-align: right; font-weight: 600;">25% deduction</td>
              </tr>
              <tr>
                <td>Between 2 to 12 hours before departure</td>
                <td style="text-align: right; font-weight: 600;">50% deduction</td>
              </tr>
              <tr>
                <td>Less than 2 hours before departure</td>
                <td style="text-align: right; font-weight: 600;">No Refund (100% deduction)</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size: 11px; color: #64748B; margin-top: 8px;">
            * Refunds are credited instantly to your AiBus Wallet upon cancellation.
          </p>

          <div class="footer-note">
            AiBus Mobility Platform &bull; 24x7 Customer Support: support@aibus.com &bull; Have a safe and pleasant journey!
          </div>
        </div>
      </body>
    </html>
  `;
}
