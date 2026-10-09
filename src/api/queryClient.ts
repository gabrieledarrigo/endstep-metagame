import { QueryClient } from "@tanstack/react-query";

const FRESH_MS = 5 * 60 * 1000;

/**
 * Creates the query client with the application's data policy, §4.8.
 *
 * @returns A client whose responses stay fresh for five minutes and never refetch when the browser window regains focus.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: FRESH_MS,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}
