import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface PhoneNumberHintResult {
  phoneNumber: string; // 10-digit national number (e.g. "8010097706")
  callingCode: string; // e.g. "+91"
  rawE164?: string; // e.g. "+918010097706"
}

/**
 * Hook to request the phone number hint from Google Play Services
 * using `react-native-nitro-google-number-hint` & `react-native-nitro-modules`.
 * Safely handles unsupported platforms (iOS, web, non-GMS Android).
 */
export function useGooglePhoneNumberHint() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    try {
      if (Platform.OS === 'android') {
        const { isPhoneNumberHintAvailable } = require('react-native-nitro-google-number-hint');
        setIsSupported(Boolean(isPhoneNumberHintAvailable && isPhoneNumberHintAvailable()));
      }
    } catch {
      setIsSupported(false);
    }
  }, []);

  const requestHint = useCallback(async (): Promise<PhoneNumberHintResult | null> => {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      const {
        getParsedPhoneNumberHint,
        requestPhoneNumberHint,
      } = require('react-native-nitro-google-number-hint');

      // Try parsed hint first
      const parts = await getParsedPhoneNumberHint();
      if (parts && parts.nationalNumber) {
        const cleanNational = parts.nationalNumber.replace(/\D/g, '').slice(-10);
        const code = parts.countryCallingCode ? `+${parts.countryCallingCode}` : '+91';
        return {
          phoneNumber: cleanNational,
          callingCode: code,
          rawE164: parts.e164,
        };
      }

      // Fallback to raw hint
      const result = await requestPhoneNumberHint();
      if (result && result.status === 'selected' && result.phoneNumber) {
        const clean = result.phoneNumber.replace(/\D/g, '').slice(-10);
        return {
          phoneNumber: clean,
          callingCode: '+91',
          rawE164: result.phoneNumber,
        };
      }

      return null;
    } catch (error) {
      // User cancelled, or device lacks Google Play Services - fail silently without blocking UX
      return null;
    }
  }, []);

  return {
    isSupported,
    requestHint,
  };
}
