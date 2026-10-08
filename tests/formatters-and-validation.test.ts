import test from 'node:test';
import assert from 'node:assert';

// Indian GSTIN validation regex (15-character alphanumeric according to GST format rules)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Indian mobile phone regex (10-digit number starting with 6-9)
const PHONE_REGEX = /^[6-9]\d{9}$/;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculateDuration(dep: string, arr: string): string {
  try {
    const [depH, depM] = dep.split(':').map(Number);
    const [arrH, arrM] = arr.split(':').map(Number);
    let diffMins = arrH * 60 + arrM - (depH * 60 + depM);
    if (diffMins < 0) diffMins += 24 * 60; // Next day arrival
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  } catch {
    return '--';
  }
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

test('GSTIN validation correctly validates valid and invalid Indian GST numbers', () => {
  const validGstins = [
    '27AAPFU0939F1ZV',
    '29AAAAA0000A1Z5',
    '07AAAAA0000A1Z2',
  ];

  for (const gstin of validGstins) {
    assert.strictEqual(GSTIN_REGEX.test(gstin), true, `GSTIN ${gstin} should be valid`);
  }

  const invalidGstins = [
    '12345',
    '27AAPFU0939F1',       // Too short
    '27AAPFU0939F1ZVV',     // Too long
    '27AAPFU0939F11V',      // Missing Z in 14th character
    'invalid_gstin_number',
  ];

  for (const gstin of invalidGstins) {
    assert.strictEqual(GSTIN_REGEX.test(gstin), false, `GSTIN ${gstin} should be invalid`);
  }
});

test('Indian mobile number validation verifies 10-digit format', () => {
  assert.strictEqual(PHONE_REGEX.test('9876543210'), true);
  assert.strictEqual(PHONE_REGEX.test('7001234567'), true);
  assert.strictEqual(PHONE_REGEX.test('8123456789'), true);

  // Invalid cases
  assert.strictEqual(PHONE_REGEX.test('1234567890'), false, 'Cannot start with 1');
  assert.strictEqual(PHONE_REGEX.test('987654321'), false, 'Must be 10 digits');
  assert.strictEqual(PHONE_REGEX.test('98765432101'), false, 'Cannot exceed 10 digits');
  assert.strictEqual(PHONE_REGEX.test('phone-number'), false);
});

test('Email validation verifies valid email format', () => {
  assert.strictEqual(EMAIL_REGEX.test('user@example.com'), true);
  assert.strictEqual(EMAIL_REGEX.test('passenger.name@travel.in'), true);
  assert.strictEqual(EMAIL_REGEX.test('invalid-email'), false);
  assert.strictEqual(EMAIL_REGEX.test('@domain.com'), false);
});

test('calculateDuration computes journey duration and handles overnight travel', () => {
  // Same day journey
  assert.strictEqual(calculateDuration('06:00', '10:30'), '4h 30m');
  assert.strictEqual(calculateDuration('14:00', '18:00'), '4h');

  // Overnight journey spanning past midnight
  assert.strictEqual(calculateDuration('22:00', '06:30'), '8h 30m');
  assert.strictEqual(calculateDuration('23:45', '00:15'), '0h 30m');
});

test('formatCurrency correctly formats INR amounts', () => {
  assert.strictEqual(formatCurrency(850), '₹850');
  assert.strictEqual(formatCurrency(1500), '₹1,500');
  assert.strictEqual(formatCurrency(25000), '₹25,000');
});
