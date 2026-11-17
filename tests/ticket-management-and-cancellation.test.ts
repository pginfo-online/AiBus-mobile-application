import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketHtml } from '../src/features/tickets/ticketHtmlTemplate.ts';
import { bookingSegment, bookingPhase, ticketPollingInterval } from '../src/features/booking/bookingLifecycle.ts';
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

test('buildTicketHtml generates valid, styled HTML using actual data in the trip-details reference layout', () => {
  const html = buildTicketHtml(mockTicket);

  // Verifies header banner & branding
  assert.ok(html.includes('Trip Details'), 'Must include AiBus Ticket Information header');
  assert.ok(html.includes('Pune-Latur'), 'Must include correct route');
  assert.ok(html.includes('TV7X89444448'), 'Must include ticket number');
  assert.ok(html.includes('1641662'), 'Must include PNR number');

  // Verifies passenger greeting & environmental message
  assert.ok(html.includes('Hello madhav more,'), 'Must greet passenger by name');
  assert.ok(html.includes('Sangitam Travels'), 'Must include operator name');

  // Verifies boarding and dropping locations
  assert.ok(html.includes('Opp. Chandani Chowk Bus Stop'), 'Must include boarding location');
  assert.ok(html.includes('Gandhi Square'), 'Must include dropping location');

  // Verifies seat and fare details
  assert.ok(html.includes('1U'), 'Must include seat number');
  assert.ok(html.includes('471.45'), 'Must include total fare paid');

  // Verifies cancellation policy
  assert.ok(!html.includes('Children above'), 'Must not invent child passenger policies');
  assert.ok(!html.includes('AiBus Wallet'), 'Must not promise an unrequested wallet refund');
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

test('booking segments and labels reflect authoritative states', () => {
  assert.equal(bookingSegment({...mockBooking,journeyDate:'2099-01-01'},'2026-11-17'),'UPCOMING');
  assert.equal(bookingSegment({...mockBooking,journeyDate:'2020-01-01'},'2026-11-17'),'PAST_TRIPS');
  assert.equal(bookingSegment({...mockBooking,status:'REFUNDED',cancelledAt:'2026-11-17'},'2026-11-17'),'CANCELLED');
  assert.equal(bookingPhase('BOOKING_FAILED'),'failed');
  assert.equal(bookingPhase('BOOKING_UNKNOWN'),'uncertain');
});
test('ticket polling has a finite response budget and stops on terminal states', () => {
  assert.equal(ticketPollingInterval('CONFIRMED',1),false);
  assert.equal(ticketPollingInterval('CANCELLED',1),false);
  assert.equal(ticketPollingInterval('BOOKING_FAILED',1),false);
  assert.equal(ticketPollingInterval('BOOKING_UNKNOWN',1),5000);
  assert.equal(ticketPollingInterval('BOOKING_REQUESTED',12),false);
});
test('ticket HTML localizes labels and includes only supplied policies', () => {
  const html=buildTicketHtml({...mockTicket,booking:{...mockBooking,cancellationPolicy:[{title:'Operator baggage rule',description:'One bag'}]}},'hi');
  assert.ok(html.includes('यात्रा का विवरण'));
  assert.ok(html.includes('Operator baggage rule'));
  assert.ok(!html.includes('Pets are not allowed'));
});
