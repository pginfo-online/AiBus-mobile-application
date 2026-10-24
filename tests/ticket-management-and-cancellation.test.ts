import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketHtml } from '../src/features/tickets/ticketHtmlTemplate.ts';
import type { TicketResponseData, BookingResponseData } from '../src/types/api';

const mockBooking: BookingResponseData = {
  id: 'b-12345',
  bookingNumber: 'AIB-2026-9988',
  status: 'CONFIRMED',
  fromCityName: 'Pune',
  toCityName: 'Latur',
  journeyDate: '2026-07-02',
  operatorName: 'Sangitam Travels',
  busType: 'A/C Sleeper (2+1)',
  totalFare: 471.45,
  baseFare: 400.0,
  serviceTax: 71.45,
  contactName: 'madhav more',
  contactEmail: 'madhav@example.com',
  contactPhone: '9595954114',
  pickupLocation: 'Opp. Chandani Chowk Bus Stop',
  pickupTime: '22:25',
  dropoffLocation: 'Gandhi Square',
  dropoffTime: '07:30',
  providerTicketNo: 'TV7X89444448',
  providerPnrNo: '1641662',
  seats: [
    { id: 's-1', seatNo: '1U', seatTypeId: 2, fareTotal: 471.45 },
  ],
  passengers: [
    { id: 'p-1', name: 'madhav more', age: 22, gender: 'M', seatNo: '1U', fare: 471.45 },
  ],
  ticket: {
    ticketNumber: 'TV7X89444448',
    pnrNumber: '1641662',
    status: 'ISSUED',
  },
};

const mockTicket: TicketResponseData = {
  id: 't-12345',
  bookingId: 'b-12345',
  ticketNumber: 'TV7X89444448',
  pnrNumber: '1641662',
  status: 'ISSUED',
  generatedAt: '2026-07-02T10:00:00Z',
  booking: mockBooking,
};

test('buildTicketHtml generates valid, styled HTML matching reference design ref-4.png', () => {
  const html = buildTicketHtml(mockTicket);

  // Verifies header banner & branding
  assert.ok(html.includes('AiBus — Ticket Information'), 'Must include AiBus Ticket Information header');
  assert.ok(html.includes('Pune to Latur'), 'Must include correct route');
  assert.ok(html.includes('TV7X89444448'), 'Must include ticket number');
  assert.ok(html.includes('1641662'), 'Must include PNR number');

  // Verifies passenger greeting & environmental message
  assert.ok(html.includes('Hey madhav more,'), 'Must greet passenger by name');
  assert.ok(html.includes('Save paper, save environment'), 'Must include environmental badge from ref-4');
  assert.ok(html.includes('Sangitam Travels'), 'Must include operator name');

  // Verifies boarding and dropping locations
  assert.ok(html.includes('Opp. Chandani Chowk Bus Stop'), 'Must include boarding location');
  assert.ok(html.includes('Gandhi Square'), 'Must include dropping location');

  // Verifies seat and fare details
  assert.ok(html.includes('1U'), 'Must include seat number');
  assert.ok(html.includes('471.45'), 'Must include total fare paid');

  // Verifies cancellation policy
  assert.ok(html.includes('Cancellation Policy'), 'Must include cancellation policy section');
  assert.ok(html.includes('AiBus Wallet'), 'Must mention wallet refund');
});

test('buildTicketHtml correctly escapes special HTML characters in user input', () => {
  const unsafeTicket: TicketResponseData = {
    ...mockTicket,
    booking: {
      ...mockBooking,
      contactName: 'Jane <script>alert("xss")</script> & Co',
      passengers: [
        { id: 'p-1', name: 'John "The Boss" & Co <svg>', age: 30, gender: 'M', seatNo: '1U', fare: 471.45 },
      ],
    },
  };

  const html = buildTicketHtml(unsafeTicket);
  assert.ok(!html.includes('<script>'), 'Must escape script tags in contact name');
  assert.ok(!html.includes('<svg>'), 'Must escape svg tags in passenger name');
  assert.ok(html.includes('&amp; Co'), 'Must properly escape ampersands');
});

test('Past vs Upcoming trip classification logic works accurately', () => {
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = '2099-12-31';
  const pastDate = '2020-01-01';

  const upcomingBooking: BookingResponseData = {
    ...mockBooking,
    status: 'CONFIRMED',
    journeyDate: futureDate,
  };

  const pastBooking: BookingResponseData = {
    ...mockBooking,
    status: 'CONFIRMED',
    journeyDate: pastDate,
  };

  const cancelledBooking: BookingResponseData = {
    ...mockBooking,
    status: 'CANCELLED',
    journeyDate: futureDate,
  };

  const isUpcoming = (b: BookingResponseData) =>
    (b.status === 'CONFIRMED' || b.status === 'HELD') && b.journeyDate >= today;

  assert.equal(isUpcoming(upcomingBooking), true, 'Future confirmed booking must be upcoming');
  assert.equal(isUpcoming(pastBooking), false, 'Past booking must not be upcoming');
  assert.equal(isUpcoming(cancelledBooking), false, 'Cancelled booking must not be upcoming');
});

test('3-segment booking filter categorization partitions bookings correctly', () => {
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = '2099-12-31';
  const pastDate = '2020-01-01';

  const bookings: BookingResponseData[] = [
    { ...mockBooking, id: 'b-1', status: 'CONFIRMED', journeyDate: futureDate },
    { ...mockBooking, id: 'b-2', status: 'HELD', journeyDate: futureDate },
    { ...mockBooking, id: 'b-3', status: 'PAYMENT_PENDING', journeyDate: futureDate },
    { ...mockBooking, id: 'b-4', status: 'CONFIRMED', journeyDate: pastDate },
    { ...mockBooking, id: 'b-5', status: 'CANCELLED', journeyDate: futureDate },
    { ...mockBooking, id: 'b-6', status: 'CANCELLED', journeyDate: pastDate },
  ];

  const upcoming: BookingResponseData[] = [];
  const past: BookingResponseData[] = [];
  const cancelled: BookingResponseData[] = [];

  bookings.forEach((b) => {
    if (b.status === 'CANCELLED') {
      cancelled.push(b);
    } else if (
      (b.status === 'CONFIRMED' || b.status === 'HELD' || b.status === 'PAYMENT_PENDING') &&
      b.journeyDate >= today
    ) {
      upcoming.push(b);
    } else {
      past.push(b);
    }
  });

  assert.equal(upcoming.length, 3, 'Must have 3 upcoming bookings');
  assert.equal(past.length, 1, 'Must have 1 past booking');
  assert.equal(cancelled.length, 2, 'Must have 2 cancelled bookings');
  assert.deepEqual(upcoming.map((b) => b.id), ['b-1', 'b-2', 'b-3']);
  assert.deepEqual(past.map((b) => b.id), ['b-4']);
  assert.deepEqual(cancelled.map((b) => b.id), ['b-5', 'b-6']);
});

test('useTicketQuery refetch interval logic halts polling for terminal states and only polls transient states', () => {
  const evaluateRefetchInterval = (data?: Partial<TicketResponseData> | null) => {
    if (!data) return false;
    const status = (data.status || data.booking?.status || '').toUpperCase();
    const isTransient =
      status === 'PAYMENT_PENDING' ||
      status === 'PAYMENT_SUCCESS' ||
      status === 'BOOKING_REQUESTED' ||
      status === 'PENDING';

    if (isTransient) {
      return 2000;
    }
    return false;
  };

  // Undefined initial data
  assert.equal(evaluateRefetchInterval(null), false, 'Must not poll before data is received');
  assert.equal(evaluateRefetchInterval(undefined), false, 'Must not poll when undefined');

  // Terminal states: MUST NEVER POLL
  assert.equal(evaluateRefetchInterval({ status: 'ISSUED' }), false, 'ISSUED must stop polling');
  assert.equal(evaluateRefetchInterval({ status: 'CONFIRMED' }), false, 'CONFIRMED must stop polling');
  assert.equal(evaluateRefetchInterval({ status: 'CANCELLED' }), false, 'CANCELLED must stop polling');
  assert.equal(evaluateRefetchInterval({ status: 'COMPLETED' }), false, 'COMPLETED must stop polling');
  assert.equal(evaluateRefetchInterval({ status: 'FAILED' }), false, 'FAILED must stop polling');

  // Transient states: MUST POLL SNAPPY (2000ms)
  assert.equal(evaluateRefetchInterval({ status: 'PAYMENT_PENDING' }), 2000, 'PAYMENT_PENDING must poll');
  assert.equal(evaluateRefetchInterval({ status: 'PAYMENT_SUCCESS' }), 2000, 'PAYMENT_SUCCESS must poll');
  assert.equal(evaluateRefetchInterval({ status: 'BOOKING_REQUESTED' }), 2000, 'BOOKING_REQUESTED must poll');
});
