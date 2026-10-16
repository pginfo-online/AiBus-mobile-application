export interface RazorpayCheckoutResult {
  success: boolean;
  status: 'SUCCESS' | 'CANCELLED' | 'FAILED';
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  merchantTxnId: string;
  errorCode?: string;
  errorDescription?: string;
}

/**
 * Pure parser for Razorpay redirect and deep-link callback parameters
 */
export function parseRazorpayCallbackParams(
  params: Record<string, any> | undefined,
  merchantTxnId: string
): RazorpayCheckoutResult {
  if (!params) {
    return {
      success: false,
      status: 'FAILED',
      merchantTxnId,
      errorDescription: 'No transaction parameters returned from payment gateway.',
    };
  }

  const statusParam = String(params.status || '').toUpperCase();
  const gatewayOrderId = String(params.gatewayOrderId || params.razorpay_order_id || '');
  const gatewayPaymentId = String(params.gatewayPaymentId || params.razorpay_payment_id || '');
  const gatewaySignature = String(params.gatewaySignature || params.razorpay_signature || '');
  const reason = params.reason || params.errorDescription;

  if (statusParam === 'SUCCESS' || (gatewayPaymentId && gatewaySignature)) {
    return {
      success: true,
      status: 'SUCCESS',
      merchantTxnId: String(params.merchantTxnId || merchantTxnId),
      gatewayOrderId: gatewayOrderId || undefined,
      gatewayPaymentId: gatewayPaymentId || undefined,
      gatewaySignature: gatewaySignature || undefined,
    };
  }

  if (statusParam === 'CANCELLED') {
    return {
      success: false,
      status: 'CANCELLED',
      merchantTxnId: String(params.merchantTxnId || merchantTxnId),
      errorDescription: 'Payment was cancelled by user.',
    };
  }

  return {
    success: false,
    status: 'FAILED',
    merchantTxnId: String(params.merchantTxnId || merchantTxnId),
    errorDescription: reason ? String(reason) : 'Payment failed at gateway.',
  };
}
