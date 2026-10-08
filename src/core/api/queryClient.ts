import { QueryClient } from '@tanstack/react-query';
import { DomainError } from '../errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default freshness
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (error instanceof DomainError) {
          return error.isRetryable;
        }
        return false;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Strict safety: Mutations are never automatically retried blindly
    },
  },
});
