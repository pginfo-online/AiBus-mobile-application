import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'aibus_auth_access_token';
const REFRESH_TOKEN_KEY = 'aibus_auth_refresh_token';
const USER_SESSION_KEY = 'aibus_user_session';

/**
 * Hardware-backed secure storage for sensitive authentication credentials.
 */
export const SecureTokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        return;
      }
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch (err) {
      console.warn('Failed to securely store access token', err);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
        return;
      }
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (err) {
      console.warn('Failed to securely store refresh token', err);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_SESSION_KEY);
        return;
      }
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_SESSION_KEY);
    } catch (err) {
      console.warn('Failed to clear secure tokens', err);
    }
  },
};

const PENDING_PAYMENT_KEY = 'aibus_pending_payment';

export interface PendingPaymentRecord {
  bookingId: string;
  merchantTxnId: string;
  amount: number;
  timestamp: number;
}

export const PendingPaymentStorage = {
  async get(): Promise<PendingPaymentRecord | null> {
    try {
      const raw = Platform.OS === 'web'
        ? localStorage.getItem(PENDING_PAYMENT_KEY)
        : await SecureStore.getItemAsync(PENDING_PAYMENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async set(record: PendingPaymentRecord): Promise<void> {
    try {
      const val = JSON.stringify(record);
      if (Platform.OS === 'web') {
        localStorage.setItem(PENDING_PAYMENT_KEY, val);
      } else {
        await SecureStore.setItemAsync(PENDING_PAYMENT_KEY, val);
      }
    } catch (err) {
      console.warn('Failed to store pending payment record', err);
    }
  },
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(PENDING_PAYMENT_KEY);
      } else {
        await SecureStore.deleteItemAsync(PENDING_PAYMENT_KEY);
      }
    } catch (err) {
      console.warn('Failed to clear pending payment record', err);
    }
  },
};
