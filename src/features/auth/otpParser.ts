/**
 * Pure utility to extract numeric OTP from SMS messages matching the PGInfo template:
 * "<#> Dear User, PGInfo login verification code is {#var#}. Valid for 5 minutes. Do not share. {#var#}"
 */
export function extractOtpFromSms(message: string, expectedLength?: number): string | null {
  if (!message || typeof message !== 'string') return null;

  // 1. Template-specific match: "verification code is 1234" or "verification code is 582914"
  const templatePattern = /(?:verification code is|login verification code is|code is)\s*(\d{4,6})/i;
  const match = templatePattern.exec(message);
  if (match && match[1]) {
    if (!expectedLength || match[1].length === expectedLength) {
      return match[1];
    }
    return match[1];
  }

  // 2. Strict OTP length match if specified
  if (expectedLength) {
    const lenRegex = new RegExp(`\\b(\\d{${expectedLength}})\\b`);
    const lenMatch = lenRegex.exec(message);
    if (lenMatch && lenMatch[1]) {
      return lenMatch[1];
    }
  }

  // 3. Fallback: general 4-6 digit numeric code
  const genericMatch = /\b(\d{4,6})\b/.exec(message);
  return genericMatch && genericMatch[1] ? genericMatch[1] : null;
}
