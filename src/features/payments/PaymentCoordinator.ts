import type { RazorpayCheckoutResult } from './razorpayHelper.ts';

type PaymentCompletionCallback = (result: RazorpayCheckoutResult) => void;

/**
 * Payment Navigation and State Coordinator
 * Prevents race conditions between Expo Router deep-link navigation and in-app auth session resolution.
 * Guarantees single-flight navigation to post-payment confirmation without white blank screen glitches.
 */
class PaymentCoordinatorImpl {
  private activeMerchantTxnId: string | null = null;
  private completionListener: PaymentCompletionCallback | null = null;
  private lastResult: { txnId: string; result: RazorpayCheckoutResult; timestamp: number } | null = null;
  private isNavigating: boolean = false;
  private handledByDeepLink: boolean = false;

  public setActiveSession(merchantTxnId: string, listener?: PaymentCompletionCallback) {
    this.activeMerchantTxnId = merchantTxnId;
    this.completionListener = listener || null;
    this.handledByDeepLink = false;
  }

  public notifyResult(result: RazorpayCheckoutResult) {
    this.lastResult = {
      txnId: result.merchantTxnId,
      result,
      timestamp: Date.now(),
    };
    if (this.completionListener) {
      this.completionListener(result);
    }
  }

  public setHandledByDeepLink(val: boolean) {
    this.handledByDeepLink = val;
  }

  public isHandledByDeepLink(): boolean {
    return this.handledByDeepLink;
  }

  public consumeLastResult(merchantTxnId: string): RazorpayCheckoutResult | null {
    if (
      this.lastResult &&
      this.lastResult.txnId === merchantTxnId &&
      Date.now() - this.lastResult.timestamp < 60000
    ) {
      return this.lastResult.result;
    }
    return null;
  }

  /**
   * Atomic lock to guarantee only one screen or service executes navigation to /booking/processing
   */
  public claimNavigationLock(): boolean {
    if (this.isNavigating) {
      return false;
    }
    this.isNavigating = true;
    setTimeout(() => {
      this.isNavigating = false;
    }, 4000);
    return true;
  }

  public releaseNavigationLock() {
    this.isNavigating = false;
  }

  public clear() {
    this.activeMerchantTxnId = null;
    this.completionListener = null;
    this.isNavigating = false;
    this.handledByDeepLink = false;
  }
}

export const PaymentCoordinator = new PaymentCoordinatorImpl();
