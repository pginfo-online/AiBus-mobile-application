import { Platform, NativeModules } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { PaymentIntentResponse } from './usePaymentMutations';
import { AppConfig } from '../../core/config/env';
import {
  parseRazorpayCallbackParams,
  RazorpayCheckoutResult,
} from './razorpayHelper';
import { PaymentCoordinator } from './PaymentCoordinator';
import { PendingPaymentStorage } from '../../core/storage';

/**
 * Production Razorpay Checkout Service
 * Supports:
 * 1. Live Razorpay Standard Checkout via secure in-app auth session (Chrome Custom Tabs on Android / ASWebAuthenticationSession on iOS)
 * 2. Native react-native-razorpay bridge if compiled in standalone binary
 * 3. Deep-link return callback handling (aibus://payment-result)
 * 4. User cancellation and dismissal recovery
 * 5. Single-flight payment coordination to prevent blank white screens
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

    // Register active payment session with coordinator
    PaymentCoordinator.setActiveSession(intent.merchantTxnId);

    // 1. Invoke official native react-native-razorpay module directly on mobile (iOS/Android)
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nativeRazorpay = require('react-native-razorpay');
        const RazorpayCheckout = nativeRazorpay.default || nativeRazorpay;

        if (RazorpayCheckout?.open) {
          const prefill = (intent.sdkPayload?.prefill as any) || {};
          const nativeOptions: Record<string, any> = {
            ...(intent.sdkPayload || {}),
            key: intent.sdkPayload?.key,
            order_id: intent.gatewayOrderId || intent.sdkPayload?.order_id,
            amount: intent.sdkPayload?.amount || Math.round(intent.amount * 100),
            name: intent.sdkPayload?.name || AppConfig.appName,
            description: intent.sdkPayload?.description || `Bus Booking #${intent.merchantTxnId}`,
            currency: intent.currency || 'INR',
            prefill: {
              name: prefill.name || '',
              email: prefill.email || '',
              contact: prefill.contact || '',
            },
            theme: {
              color: '#013C9A',
            },
            modal: {
              confirm_close: true,
            },
            notes: {
              bookingId: (intent.sdkPayload?.notes as any)?.bookingId || '',
              merchantTxnId: intent.merchantTxnId,
            },
          };

          const nativeData = await RazorpayCheckout.open(nativeOptions);
          const result: RazorpayCheckoutResult = {
            success: true,
            status: 'SUCCESS',
            merchantTxnId: intent.merchantTxnId,
            gatewayPaymentId: nativeData.razorpay_payment_id,
            gatewayOrderId: nativeData.razorpay_order_id || intent.gatewayOrderId,
            gatewaySignature: nativeData.razorpay_signature,
          };
          PaymentCoordinator.notifyResult(result);
          return result;
        }
      } catch (nativeErr: any) {
        // Native module error or user cancellation
        const code = nativeErr?.code;
        const description = String(nativeErr?.description || nativeErr?.message || '');
        const isCancelled =
          code === 0 ||
          code === 'PAYMENT_CANCELLED' ||
          description.toLowerCase().includes('cancel') ||
          description.toLowerCase().includes('dismiss');

        if (isCancelled) {
          const result: RazorpayCheckoutResult = {
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment was cancelled by user.',
          };
          PaymentCoordinator.notifyResult(result);
          return result;
        }

        // Genuine payment decline or bank error from native SDK
        if (
          code !== undefined &&
          code !== null &&
          !description.includes('null') &&
          !description.includes('undefined') &&
          !description.includes('Cannot find native module')
        ) {
          const result: RazorpayCheckoutResult = {
            success: false,
            status: 'FAILED',
            merchantTxnId: intent.merchantTxnId,
            errorCode: String(code),
            errorDescription: description || 'Payment was declined by issuing bank.',
          };
          PaymentCoordinator.notifyResult(result);
          return result;
        }

        // If native module was not truly compiled in this binary, fall through to in-app hosted checkout
        console.warn('Native Razorpay invocation unavailable, falling back to in-app secure checkout:', nativeErr);
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

      const finish = (res: RazorpayCheckoutResult) => {
        if (resolved) return;
        resolved = true;
        urlSubscription.remove();
        PaymentCoordinator.notifyResult(res);
        try {
          WebBrowser.dismissAuthSession();
        } catch {
          // Safe ignore
        }
        resolve(res);
      };

      // Deep link subscription fallback for backgrounding / app switch
      const urlSubscription = Linking.addEventListener('url', (event) => {
        if (resolved) return;
        const parsed = Linking.parse(event.url);
        if (parsed.scheme === 'aibus' && (parsed.hostname === 'payment-result' || parsed.path === 'payment-result')) {
          const res = RazorpayService.parseCallbackParams(parsed.queryParams || undefined, intent.merchantTxnId);
          finish(res);
        }
      });

      try {
        const authResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);

        if (resolved) return;

        // Check if deep link listener or coordinator already captured the outcome
        const coordinatedResult = PaymentCoordinator.consumeLastResult(intent.merchantTxnId);
        if (coordinatedResult) {
          finish(coordinatedResult);
          return;
        }

        if (authResult.type === 'success' && authResult.url) {
          const parsed = Linking.parse(authResult.url);
          finish(RazorpayService.parseCallbackParams(parsed.queryParams || undefined, intent.merchantTxnId));
        } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
          // Guard: On Android, Chrome Custom Tabs dismisses automatically upon deep link scheme redirect.
          // Check if pending storage already recorded payment credentials before treating as cancelled.
          const pending = await PendingPaymentStorage.get();
          if (
            pending &&
            pending.merchantTxnId === intent.merchantTxnId &&
            pending.gatewayPaymentId &&
            pending.gatewaySignature
          ) {
            finish({
              success: true,
              status: 'SUCCESS',
              merchantTxnId: intent.merchantTxnId,
              gatewayOrderId: pending.gatewayOrderId,
              gatewayPaymentId: pending.gatewayPaymentId,
              gatewaySignature: pending.gatewaySignature,
            });
            return;
          }

          finish({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment was cancelled or closed.',
          });
        } else {
          finish({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'Payment session ended without completion.',
          });
        }
      } catch (browserErr: any) {
        if (resolved) return;

        // Browser launch fallback
        try {
          await WebBrowser.openBrowserAsync(checkoutUrl);
          finish({
            success: false,
            status: 'CANCELLED',
            merchantTxnId: intent.merchantTxnId,
            errorDescription: 'External browser opened. Awaiting verification callback.',
          });
        } catch (openErr: any) {
          finish({
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

