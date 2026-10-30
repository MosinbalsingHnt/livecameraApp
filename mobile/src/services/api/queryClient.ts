import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { MutationObserverOptions } from '@tanstack/react-query';

const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, retryDelay: backoff },
    mutations: { retry: 3, retryDelay: backoff },
  },
});

/** Run a mutation outside React (background service) through the same client. */
export function runMutation<TData, TVars>(
  options: MutationObserverOptions<TData, Error, TVars>,
  vars: TVars,
) {
  return new MutationObserver<TData, Error, TVars>(queryClient, options).mutate(vars);
}
