import test from 'node:test';
import assert from 'node:assert';
import { PaymentCoordinator } from '../src/features/payments/PaymentCoordinator.ts';

test('PaymentCoordinator claims and enforces single-flight navigation lock', () => {
  PaymentCoordinator.clear();

  // First claim should succeed
  const firstClaim = PaymentCoordinator.claimNavigationLock();
  assert.strictEqual(firstClaim, true);

  // Simultaneous second claim from another event (e.g. WebBrowser dismiss while deep link active) must be rejected
  const secondClaim = PaymentCoordinator.claimNavigationLock();
  assert.strictEqual(secondClaim, false);

  // Releasing the lock resets the state
  PaymentCoordinator.releaseNavigationLock();

  // Claiming again succeeds
  const thirdClaim = PaymentCoordinator.claimNavigationLock();
  assert.strictEqual(thirdClaim, true);

  PaymentCoordinator.releaseNavigationLock();
});

test('PaymentCoordinator sets and consumes pending payment result atomically', () => {
  PaymentCoordinator.clear();

  PaymentCoordinator.notifyResult({
    success: true,
    status: 'SUCCESS',
    merchantTxnId: 'TXN-1234',
    gatewayPaymentId: 'pay_test_001',
    gatewayOrderId: 'order_test_001',
    gatewaySignature: 'sig_test_001',
  });

  const consumed1 = PaymentCoordinator.consumeLastResult('TXN-1234');
  assert.ok(consumed1);
  assert.strictEqual(consumed1.success, true);
  assert.strictEqual(consumed1.merchantTxnId, 'TXN-1234');

  // Mismatched transaction ID returns null
  const mismatch = PaymentCoordinator.consumeLastResult('DIFFERENT-TXN');
  assert.strictEqual(mismatch, null);
});

test('PaymentCoordinator tracks deep link handled state to prevent dismiss race conditions', () => {
  PaymentCoordinator.clear();

  assert.strictEqual(PaymentCoordinator.isHandledByDeepLink(), false);

  PaymentCoordinator.setHandledByDeepLink(true);
  assert.strictEqual(PaymentCoordinator.isHandledByDeepLink(), true);

  PaymentCoordinator.clear();
  assert.strictEqual(PaymentCoordinator.isHandledByDeepLink(), false);
});
