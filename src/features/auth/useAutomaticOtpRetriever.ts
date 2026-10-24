import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { extractOtpFromSms } from './otpParser';

export { extractOtpFromSms };

export function useAutomaticOtpRetriever(
  onOtpDetected?: (otp: string) => void,
  expectedLength = 6
) {
  const [appHash, setAppHash] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const callbackRef = useRef(onOtpDetected);
  callbackRef.current = onOtpDetected;

  // Retrieve app hash for Android SMS Retriever API
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let isMounted = true;
    try {
      const OtpVerify = require('react-native-otp-verify');
      if (OtpVerify && typeof OtpVerify.getHash === 'function') {
        OtpVerify.getHash()
          .then((hashes: string[]) => {
            if (isMounted && hashes && hashes.length > 0) {
              setAppHash(hashes[0]);
            }
          })
          .catch(() => {});
      }
    } catch {
      // Ignored if native module is unavailable
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Start SMS listener
  const startListening = useCallback(() => {
    if (Platform.OS !== 'android') return;

    try {
      const OtpVerify = require('react-native-otp-verify');
      if (OtpVerify && typeof OtpVerify.startOtpListener === 'function') {
        setListening(true);
        OtpVerify.startOtpListener((message: string) => {
          if (!message) return;
          const extracted = extractOtpFromSms(message, expectedLength);
          if (extracted && callbackRef.current) {
            callbackRef.current(extracted);
          }
        }).catch(() => {
          setListening(false);
        });
      }
    } catch {
      setListening(false);
    }
  }, [expectedLength]);

  // Stop SMS listener
  const stopListening = useCallback(() => {
    if (Platform.OS !== 'android') return;
    try {
      const OtpVerify = require('react-native-otp-verify');
      if (OtpVerify && typeof OtpVerify.removeListener === 'function') {
        OtpVerify.removeListener();
        setListening(false);
      }
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  return {
    appHash,
    listening,
    startListening,
    stopListening,
  };
}
