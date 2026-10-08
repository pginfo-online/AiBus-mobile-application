import test from 'node:test';
import assert from 'node:assert';
import { DomainError, normalizeError } from '../src/core/errors/index.ts';

test('normalizeError preserves DomainError instances', () => {
  const custom = new DomainError({
    category: 'AUTHENTICATION',
    code: 'TOKEN_EXPIRED',
    message: 'Session has expired',
    statusCode: 401,
  });

  const normalized = normalizeError(custom);
  assert.strictEqual(normalized, custom);
  assert.strictEqual(normalized.category, 'AUTHENTICATION');
  assert.strictEqual(normalized.code, 'TOKEN_EXPIRED');
});

test('normalizeError handles network disconnection', () => {
  const networkErr = {
    isAxiosError: true,
    code: 'ERR_NETWORK',
    message: 'Network Error',
    response: undefined,
  };

  const normalized = normalizeError(networkErr);
  assert.strictEqual(normalized.category, 'NETWORK');
  assert.strictEqual(normalized.code, 'NETWORK_DISCONNECTED');
  assert.strictEqual(normalized.isRetryable, true);
});

test('normalizeError maps 401 to AUTHENTICATION', () => {
  const unauthorizedErr = {
    isAxiosError: true,
    response: {
      status: 401,
      data: {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      },
    },
  };

  const normalized = normalizeError(unauthorizedErr);
  assert.strictEqual(normalized.category, 'AUTHENTICATION');
  assert.strictEqual(normalized.statusCode, 401);
  assert.strictEqual(normalized.code, 'UNAUTHORIZED');
});

test('normalizeError maps 409 to CONFLICT', () => {
  const conflictErr = {
    isAxiosError: true,
    response: {
      status: 409,
      data: {
        error: {
          code: 'SEAT_ALREADY_LOCKED',
          message: 'Selected seat is already held by another passenger',
        },
      },
    },
  };

  const normalized = normalizeError(conflictErr);
  assert.strictEqual(normalized.category, 'CONFLICT');
  assert.strictEqual(normalized.statusCode, 409);
  assert.strictEqual(normalized.code, 'SEAT_ALREADY_LOCKED');
});

test('normalizeError maps 429 to RATE_LIMIT', () => {
  const rateLimitErr = {
    isAxiosError: true,
    response: {
      status: 429,
      data: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many search requests',
        },
      },
    },
  };

  const normalized = normalizeError(rateLimitErr);
  assert.strictEqual(normalized.category, 'RATE_LIMIT');
  assert.strictEqual(normalized.statusCode, 429);
});

test('normalizeError maps 502/503 to PROVIDER error', () => {
  const providerErr = {
    isAxiosError: true,
    response: {
      status: 502,
      data: {
        error: {
          code: 'GDS_SERVICE_UNAVAILABLE',
          message: 'Downstream bus operator GDS timed out',
        },
      },
    },
  };

  const normalized = normalizeError(providerErr);
  assert.strictEqual(normalized.category, 'PROVIDER');
  assert.strictEqual(normalized.statusCode, 502);
  assert.strictEqual(normalized.isRetryable, true);
});
