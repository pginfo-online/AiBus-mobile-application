import test from 'node:test';
import assert from 'node:assert';
import { parseRazorpayCallbackParams } from '../src/features/payments/razorpayHelper.ts';

test('parseRazorpayCallbackParams parses successful callback', () => {
  const result = parseRazorpayCallbackParams(
    {
      status: 'SUCCESS',
      merchantTxnId: 'RZP-BKG1001-1234567890',
      gatewayOrderId: 'order_9A33XWu170gUtm',
      gatewayPaymentId: 'pay_29QQoUBi66xm2f',
      gatewaySignature: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d',
    },
    'RZP-BKG1001-1234567890'
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, 'SUCCESS');
  assert.strictEqual(result.gatewayOrderId, 'order_9A33XWu170gUtm');
  assert.strictEqual(result.gatewayPaymentId, 'pay_29QQoUBi66xm2f');
  assert.strictEqual(result.gatewaySignature, '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d');
  assert.strictEqual(result.merchantTxnId, 'RZP-BKG1001-1234567890');
});

test('parseRazorpayCallbackParams handles alternative razorpay key names', () => {
  const result = parseRazorpayCallbackParams(
    {
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_456',
      razorpay_signature: 'sig_test_789',
    },
    'RZP-DEFAULT-TXN'
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, 'SUCCESS');
  assert.strictEqual(result.gatewayOrderId, 'order_test_123');
  assert.strictEqual(result.gatewayPaymentId, 'pay_test_456');
  assert.strictEqual(result.gatewaySignature, 'sig_test_789');
  assert.strictEqual(result.merchantTxnId, 'RZP-DEFAULT-TXN');
});

test('parseRazorpayCallbackParams handles cancellation', () => {
  const result = parseRazorpayCallbackParams(
    {
      status: 'CANCELLED',
      merchantTxnId: 'RZP-BKG-CANCEL',
    },
    'RZP-BKG-CANCEL'
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'CANCELLED');
  assert.strictEqual(result.merchantTxnId, 'RZP-BKG-CANCEL');
  assert.ok(result.errorDescription?.includes('cancelled'));
});

test('parseRazorpayCallbackParams handles gateway failure', () => {
  const result = parseRazorpayCallbackParams(
    {
      status: 'FAILED',
      merchantTxnId: 'RZP-BKG-FAIL',
      reason: 'BAD_REQUEST_ERROR: Card has expired',
    },
    'RZP-BKG-FAIL'
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'FAILED');
  assert.strictEqual(result.merchantTxnId, 'RZP-BKG-FAIL');
  assert.ok(result.errorDescription?.includes('Card has expired'));
});

test('parseRazorpayCallbackParams handles undefined/empty params gracefully', () => {
  const result = parseRazorpayCallbackParams(undefined, 'RZP-EMPTY');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 'FAILED');
  assert.strictEqual(result.merchantTxnId, 'RZP-EMPTY');
  assert.ok(result.errorDescription?.includes('No transaction parameters'));
});
