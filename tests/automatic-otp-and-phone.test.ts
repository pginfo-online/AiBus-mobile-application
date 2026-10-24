import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOtpFromSms } from '../src/features/auth/otpParser.ts';

test('extractOtpFromSms correctly extracts 4-digit OTP from exact PGInfo SMS template', () => {
  const sms = '<#> Dear User, PGInfo login verification code is 1234. Valid for 5 minutes. Do not share. AbCdEfGhIjK';
  const otp = extractOtpFromSms(sms, 4);
  assert.equal(otp, '1234');
});

test('extractOtpFromSms correctly extracts 6-digit OTP from exact PGInfo SMS template', () => {
  const sms = '<#> Dear User, PGInfo login verification code is 582914. Valid for 5 minutes. Do not share. AbCdEfGhIjK';
  const otp = extractOtpFromSms(sms, 6);
  assert.equal(otp, '582914');
});

test('extractOtpFromSms does not confuse the 11-character app hash with the numeric OTP', () => {
  const sms = '<#> Dear User, PGInfo login verification code is 884210. Valid for 5 minutes. Do not share. W9X1A2B3C4D';
  const otp = extractOtpFromSms(sms);
  assert.equal(otp, '884210');
});

test('extractOtpFromSms handles multi-line and whitespace variations in SMS', () => {
  const sms = '<#>\nDear User,\nPGInfo login verification code is 910245.\nValid for 5 minutes. Do not share.\nAbCdEfGhIjK';
  const otp = extractOtpFromSms(sms, 6);
  assert.equal(otp, '910245');
});

test('extractOtpFromSms returns null for non-OTP messages', () => {
  const sms = 'Your bus from Pune to Mumbai has been confirmed. PNR: PNR1234.';
  const otp = extractOtpFromSms(sms, 6);
  assert.equal(otp, null);
});

test('Indian mobile number parsing strips prefix and validates 10 digits', () => {
  const sanitize = (raw: string) => raw.replace(/\D/g, '').slice(-10);
  const isValid = (num: string) => /^[6-9]\d{9}$/.test(num);

  assert.equal(sanitize('+91 80100 97706'), '8010097706');
  assert.equal(isValid(sanitize('+91 80100 97706')), true);

  assert.equal(sanitize('+91-9923400506'), '9923400506');
  assert.equal(isValid(sanitize('+91-9923400506')), true);

  // Invalid numbers starting with 0-5
  assert.equal(isValid('1234567890'), false);
  assert.equal(isValid('5555555555'), false);
});
