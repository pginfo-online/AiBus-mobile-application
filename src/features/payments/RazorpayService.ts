import { Platform, NativeModules } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { PaymentIntentResponse } from './usePaymentMutations';
import { AppConfig } from '../../core/config/env';
import {
  parseRazorpayCallbackParams,
  RazorpayCheckoutResult,
} from './razorpayHelper';

/**
 * Production Razorpay Checkout Service
 * Supports:
 * 1. Live Razorpay Standard Checkout via secure in-app auth session (Chrome Custom Tabs on Android / ASWebAuthenticationSession on iOS)
 * 2. Native react-native-razorpay bridge if compiled in standalone binary
 * 3. Deep-link return callback handling (aibus://payment-result)
 * 4. User cancellation and dismissal recovery
 */
export const RazorpayService = {
  /**
   * Open Razorpay checkout sheet and await authentic transaction result
   */
  async openCheckout(
    intent: PaymentIntentResponse,
    options?: { redirectUrl?: string }
  ): Promise<RazorpayCheckoutResult> {
    const redirectUrl = options?.redirectUrl || 'aibus://payment-result';

    // 1. Check if native react-native-razorpay module is linked and available in binary
    const nativeModule =
      NativeModules.RNPPaymentOnboardingModule || NativeModules.RazorpayCheckout;

    if (nativeModule && Platform.OS !== 'web') {
      try {
        const nativeRazorpay = require('react-native-razorpay');
        const RazorpayCheckout = nativeRazorpay.default || nativeRazorpay;

        if (RazorpayCheckout?.open && intent.sdkPayload) {
          const nativeOptions = {
            ...intent.sdkPayload,
            key: intent.sdkPayload.key,
            order_id: intent.gatewayOrderId || intent.sdkPayload.order_id,
            amount: intent.sdkPayload.amount,
            name: intent.sdkPayload.name || AppConfig.appName,
            currency: intent.currency || 'INR',
          };

          const nativeData = await RazorpayCheckout.open(nativeOptions);
          return {
            success: true,
            status: 'SUCCESS',
            merchantTxnId: intent.merchantTxnId,
            gatewayPaymentId: nativeData.razorpay_payment_id,
            gatewayOrderId: nativeData.razorpay_order_id || intent.gatewayOrderId,
            gatewaySignature: nativeData.razorpay_signature,
          };
        }
      } catch (nativeErr: any) {
        // Native module error or user cancellation
        const code = nativeErr?.code;
        const description = nativeErr?.description || nativeErr?.message;

        if (code === 0 || code === 'PAYMENT_CANCELLED' || description?.includes('cancelled')) {
          return {
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment was cancelled by user.',
          };
        }

        // If native module was not truly configured, fall through to in-app hosted checkout
        console.warn('Native Razorpay invocation failed, attempting in-app checkout fallback:', nativeErr);
      }
    }

    // 2. High-fidelity in-app Razorpay standard checkout
    // Resolves hosted checkout URL from backend
    let checkoutUrl = intent.paymentUrl;
    if (!checkoutUrl || !checkoutUrl.startsWith('http')) {
      const apiOrigin = AppConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
      checkoutUrl = `${apiOrigin}/api/v1/payments/checkout/${encodeURIComponent(
        intent.merchantTxnId
      )}?redirectUrl=${encodeURIComponent(redirectUrl)}`;
    } else if (!checkoutUrl.includes('redirectUrl=')) {
      const sep = checkoutUrl.includes('?') ? '&' : '?';
      checkoutUrl = `${checkoutUrl}${sep}redirectUrl=${encodeURIComponent(redirectUrl)}`;
    }

    return new Promise<RazorpayCheckoutResult>(async (resolve) => {
      let resolved = false;

      // Deep link subscription fallback for backgrounding / app switch
      const urlSubscription = Linking.addEventListener('url', (event) => {
        if (resolved) return;
        const parsed = Linking.parse(event.url);
        if (parsed.scheme === 'aibus' && (parsed.hostname === 'payment-result' || parsed.path === 'payment-result')) {
          resolved = true;
          urlSubscription.remove();
          try {
            WebBrowser.dismissAuthSession();
          } catch {
            // Ignore dismiss error
          }
          resolve(RazorpayService.parseCallbackParams(parsed.queryParams || undefined, intent.merchantTxnId));
        }
      });

      try {
        const authResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);

        if (resolved) return;

        if (authResult.type === 'success' && authResult.url) {
          resolved = true;
          urlSubscription.remove();
          const parsed = Linking.parse(authResult.url);
          resolve(RazorpayService.parseCallbackParams(parsed.queryParams || undefined, intent.merchantTxnId));
        } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
          resolved = true;
          urlSubscription.remove();
          resolve({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment was cancelled or closed.',
          });
        } else {
          resolved = true;
          urlSubscription.remove();
          resolve({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment session ended without completion.',
          });
        }
      } catch (browserErr: any) {
        if (resolved) return;
        resolved = true;
        urlSubscription.remove();

        // Browser launch fallback
        try {
          await WebBrowser.openBrowserAsync(checkoutUrl);
          resolve({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'External browser opened. Awaiting verification callback.',
          });
        } catch (openErr: any) {
          resolve({
            success: false,
            status: 'FAILED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: openErr?.message || browserErr?.message || 'Could not open payment gateway.',
          });
        }
      }
    });
  },

  /**
   * Parses callback URL query parameters into unified checkout result
   */
  parseCallbackParams(
    params: Record<string, any> | undefined,
    merchantTxnId: string
  ): RazorpayCheckoutResult {
    return parseRazorpayCallbackParams(params, merchantTxnId);
  },
};

export { parseRazorpayCallbackParams };
export type { RazorpayCheckoutResult };

