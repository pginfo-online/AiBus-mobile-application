import { Platform } from 'react-native';

/**
 * Mobile Application Environment Configuration
 */

// In development:
// - Android Emulator uses 10.0.2.2 to access host machine
// - iOS Simulator uses localhost or local LAN IP
// - Physical devices use LAN IP (e.g. 192.168.1.X)
const getDevApiBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

export const AppConfig = {
  appName: 'AiBus',
  appVersion: '1.0.0',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || getDevApiBaseUrl(),
  requestTimeoutMs: 15000,
  phonePeMerchantId: process.env.EXPO_PUBLIC_PHONEPE_MERCHANT_ID || 'M22GDSUAT',
  supportPhone: '+91 80 4710 5555',
  supportEmail: 'support@aibus.in',
  seatHoldTtlSeconds: 600, // 10 minutes
  maxSeatsPerBooking: 6,
};
