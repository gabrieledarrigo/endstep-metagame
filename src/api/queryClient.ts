import { QueryClient } from "@tanstack/react-query";
import { isRetryable } from "./client";

const FRESH_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

/**
 * Creates the query client with the application's data policy, §4.8.
 *
 * @returns A client whose responses stay fresh for five minutes, that never refetches when the browser window regains focus, and that retries a network error, a 429 or a 5xx at most twice, after 400 ms and then 800 ms.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: FRESH_MS,
        refetchOnWindowFocus: false,
        retry: (failures, error) =>
          failures < MAX_RETRIES && isRetryable(error),
        retryDelay: (attempt) => RETRY_BASE_MS * 2 ** attempt,
      },
    },
  });
}
