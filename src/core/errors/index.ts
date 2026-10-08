import axios, { AxiosError } from 'axios';

export type DomainErrorCategory =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'PAYMENT'
  | 'BUSINESS_RULE'
  | 'RATE_LIMIT'
  | 'PROVIDER'
  | 'UNKNOWN';

export interface DomainErrorOptions {
  category: DomainErrorCategory;
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  isRetryable?: boolean;
  requestId?: string;
}

export class DomainError extends Error {
  public readonly category: DomainErrorCategory;
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly requestId?: string;

  constructor(options: DomainErrorOptions) {
    super(options.message);
    this.name = 'DomainError';
    this.category = options.category;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.isRetryable = options.isRetryable ?? false;
    this.requestId = options.requestId;
  }
}

/**
 * Normalizes any error (Axios, Network, Runtime) into a clean, typed DomainError.
 * Raw Axios errors are strictly quarantined and never surfaced to React components.
 */
export function normalizeError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{
      success?: boolean;
      error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
        requestId?: string;
      };
    }>;

    const status = axiosErr.response?.status;
    const errorBody = axiosErr.response?.data?.error;
    const serverCode = errorBody?.code;
    const serverMessage = errorBody?.message;
    const requestId = errorBody?.requestId;

    // 1. Network / Connection drop
    if (axiosErr.code === 'ERR_NETWORK' || !axiosErr.response) {
      return new DomainError({
        category: 'NETWORK',
        code: 'NETWORK_DISCONNECTED',
        message: 'No internet connection. Please check your network and try again.',
        isRetryable: true,
      });
    }

    // 2. Timeout
    if (axiosErr.code === 'ECONNABORTED' || status === 408 || status === 504) {
      return new DomainError({
        category: 'TIMEOUT',
        code: 'TIMEOUT',
        message: 'The request took too long to complete. Please try again.',
        statusCode: status,
        isRetryable: true,
        requestId,
      });
    }

    // 3. Authentication & Authorization
    if (status === 401) {
      const isExpired = serverCode === 'AUTH_EXPIRED';
      return new DomainError({
        category: 'AUTHENTICATION',
        code: serverCode || 'AUTH_INVALID',
        message: isExpired
          ? 'Your session has expired. Please log in again.'
          : serverMessage || 'Invalid email or password.',
        statusCode: 401,
        requestId,
      });
    }

    if (status === 403) {
      return new DomainError({
        category: 'AUTHORIZATION',
        code: serverCode || 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource.',
        statusCode: 403,
        requestId,
      });
    }

    // 4. Validation
    if (status === 400) {
      return new DomainError({
        category: 'VALIDATION',
        code: serverCode || 'VALIDATION_ERROR',
        message: serverMessage || 'Please verify the details entered.',
        statusCode: 400,
        details: errorBody?.details,
        requestId,
      });
    }

    // 5. Conflicts / Seat Unavailable
    if (status === 409 || status === 410) {
      const isSeatIssue = serverCode === 'SEAT_NOT_AVAILABLE' || serverCode === 'SEAT_HOLD_FAILED';
      const isHoldExpired = serverCode === 'SEAT_HOLD_EXPIRED';
      return new DomainError({
        category: 'CONFLICT',
        code: serverCode || 'CONFLICT',
        message: isHoldExpired
          ? 'Your seat hold has expired. Please select seats again.'
          : isSeatIssue
            ? 'One or more selected seats were just taken. Please choose other seats.'
            : serverMessage || 'The request could not be processed due to a conflict.',
        statusCode: status,
        requestId,
      });
    }

    // 6. Payment decline
    if (status === 402) {
      return new DomainError({
        category: 'PAYMENT',
        code: serverCode || 'PAYMENT_FAILED',
        message: serverMessage || 'Payment was declined by your bank. Please try another payment method.',
        statusCode: 402,
        requestId,
      });
    }

    // 7. Rate Limiting
    if (status === 429) {
      return new DomainError({
        category: 'RATE_LIMIT',
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment before trying again.',
        statusCode: 429,
        isRetryable: true,
        requestId,
      });
    }

    // 8. Provider failure (502 / 503)
    if (status === 502 || status === 503) {
      return new DomainError({
        category: 'PROVIDER',
        code: serverCode || 'PROVIDER_UNAVAILABLE',
        message: 'The bus operator reservation system is temporarily unavailable. Please try again shortly.',
        statusCode: status,
        isRetryable: true,
        requestId,
      });
    }

    // 9. Generic Server Error
    return new DomainError({
      category: 'BUSINESS_RULE',
      code: serverCode || 'SERVER_ERROR',
      message: serverMessage || 'An unexpected error occurred. Please try again.',
      statusCode: status || 500,
      requestId,
    });
  }

  if (error instanceof Error) {
    return new DomainError({
      category: 'UNKNOWN',
      code: 'UNEXPECTED_ERROR',
      message: error.message || 'An unexpected error occurred.',
    });
  }

  return new DomainError({
    category: 'UNKNOWN',
    code: 'UNKNOWN',
    message: 'Something unexpected happened. Please try again.',
  });
}
