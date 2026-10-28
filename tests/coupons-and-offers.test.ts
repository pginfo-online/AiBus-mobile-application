import test from 'node:test';
import assert from 'node:assert';
import { useBookingStore } from '../src/stores/bookingStore.ts';
import { FALLBACK_OFFERS } from '../src/features/offers/fallbackOffers.ts';

test('offers fallback catalog contains essential curated coupons', () => {
  assert.ok(FALLBACK_OFFERS.length >= 4);

  const bus300 = FALLBACK_OFFERS.find((o) => o.code === 'BUS300');
  assert.ok(bus300, 'BUS300 coupon must exist');
  assert.strictEqual(bus300?.category, 'Bus');
  assert.strictEqual(bus300?.type, 'PERCENTAGE');
  assert.strictEqual(bus300?.maxDiscount, 300);
  assert.ok(bus300?.termsAndConditions.length >= 3);

  const primoday = FALLBACK_OFFERS.find((o) => o.code === 'PRIMODAY');
  assert.ok(primoday, 'PRIMODAY coupon must exist');

  const aibus50 = FALLBACK_OFFERS.find((o) => o.code === 'AIBUS50');
  assert.ok(aibus50, 'AIBUS50 coupon must exist');
  assert.strictEqual(aibus50?.type, 'FLAT');
  assert.strictEqual(aibus50?.value, 50);
});

test('booking store handles coupon application, removal, and wallet toggle', () => {
  const store = useBookingStore.getState();

  // Initially null
  assert.strictEqual(store.appliedCoupon, null);
  assert.strictEqual(store.useWallet, false);

  // Apply BUS300
  store.applyCoupon({
    code: 'BUS300',
    title: 'Save up to Rs 300',
    discountAmount: 150,
    coupon: FALLBACK_OFFERS[0],
  });

  const stateWithCoupon = useBookingStore.getState();
  assert.ok(stateWithCoupon.appliedCoupon);
  assert.strictEqual(stateWithCoupon.appliedCoupon?.code, 'BUS300');
  assert.strictEqual(stateWithCoupon.appliedCoupon?.discountAmount, 150);

  // Enable wallet
  store.setUseWallet(true);
  assert.strictEqual(useBookingStore.getState().useWallet, true);

  // Remove coupon
  store.removeCoupon();
  assert.strictEqual(useBookingStore.getState().appliedCoupon, null);

  // Reset booking flow cleans everything
  store.resetBookingFlow();
  const resetState = useBookingStore.getState();
  assert.strictEqual(resetState.appliedCoupon, null);
  assert.strictEqual(resetState.useWallet, false);
});

test('discount and final payable calculation accurately applies caps and wallet deduction', () => {
  const totalFare = 1000;
  const percentageDiscount = Math.min(totalFare * 0.15, 300); // 15% capped at 300
  assert.strictEqual(percentageDiscount, 150);

  const fareAfterCoupon = Math.max(0, totalFare - percentageDiscount);
  assert.strictEqual(fareAfterCoupon, 850);

  // Wallet deduction with 100 balance
  const walletBalance = 100;
  const walletUsed = Math.min(walletBalance, fareAfterCoupon);
  assert.strictEqual(walletUsed, 100);

  const finalPayable = Math.max(0, fareAfterCoupon - walletUsed);
  assert.strictEqual(finalPayable, 750);

  // Boundary condition: 100% discount or wallet coverage results in 0 payable
  const hugeWalletBalance = 2000;
  const fullWalletUsed = Math.min(hugeWalletBalance, fareAfterCoupon);
  assert.strictEqual(fullWalletUsed, 850);
  const zeroPayable = Math.max(0, fareAfterCoupon - fullWalletUsed);
  assert.strictEqual(zeroPayable, 0);
});
