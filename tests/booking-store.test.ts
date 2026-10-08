import test from 'node:test';
import assert from 'node:assert';
import { useBookingStore } from '../src/stores/bookingStore.ts';

test('booking store initializes with default cities', () => {
  const state = useBookingStore.getState();
  assert.strictEqual(state.fromCity.name, 'Mumbai');
  assert.strictEqual(state.toCity.name, 'Pune');
  assert.strictEqual(state.selectedSeats.length, 0);
  assert.strictEqual(state.activeHold, null);
});

test('swapCities exchanges fromCity and toCity', () => {
  const store = useBookingStore.getState();
  const initialFrom = store.fromCity;
  const initialTo = store.toCity;

  store.swapCities();

  const swapped = useBookingStore.getState();
  assert.strictEqual(swapped.fromCity.name, initialTo.name);
  assert.strictEqual(swapped.toCity.name, initialFrom.name);

  // Swap back
  swapped.swapCities();
});

test('toggleSeat enforces max 6 seats constraint', () => {
  const store = useBookingStore.getState();
  store.clearSeats();

  // Add 6 seats
  for (let i = 1; i <= 6; i++) {
    const success = store.toggleSeat({
      seqNo: i,
      seatNo: `S${i}`,
      seatType: 1,
      deck: 1,
      fare: 500,
      baseFare: 450,
      tax: 50,
    });
    assert.strictEqual(success, true, `Seat S${i} should be successfully added`);
  }

  assert.strictEqual(useBookingStore.getState().selectedSeats.length, 6);

  // Attempt to add a 7th seat - should fail
  const seventhSuccess = store.toggleSeat({
    seqNo: 7,
    seatNo: 'S7',
    seatType: 1,
    deck: 1,
    fare: 500,
    baseFare: 450,
    tax: 50,
  });

  assert.strictEqual(seventhSuccess, false, 'Adding 7th seat should be rejected');
  assert.strictEqual(useBookingStore.getState().selectedSeats.length, 6);

  // Deselect one seat
  const removeSuccess = store.toggleSeat({
    seqNo: 1,
    seatNo: 'S1',
    seatType: 1,
    deck: 1,
    fare: 500,
    baseFare: 450,
    tax: 50,
  });
  assert.strictEqual(removeSuccess, true);
  assert.strictEqual(useBookingStore.getState().selectedSeats.length, 5);

  store.clearSeats();
});

test('resetBookingFlow resets transient booking selection', () => {
  const store = useBookingStore.getState();
  store.setActiveHold({
    id: 'hold-123',
    providerHoldId: 'ph-456',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    ttlSeconds: 600,
    totalFare: 1200,
  });
  store.setActiveBooking('bk-123', 'AIB-999');

  store.resetBookingFlow();

  const resetState = useBookingStore.getState();
  assert.strictEqual(resetState.selectedBus, null);
  assert.strictEqual(resetState.selectedSeats.length, 0);
  assert.strictEqual(resetState.activeHold, null);
  assert.strictEqual(resetState.activeBookingId, null);
  assert.strictEqual(resetState.activeBookingNumber, null);
});
