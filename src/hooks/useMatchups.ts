import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { fetchMatchups } from "../api/endpoints";
import type { MatchupMatrix, TimeWindow } from "../api/types";

/**
 * Reads the matchup matrix of a window, with no automatic retry, FR-12.
 *
 * The matchup page and the deck page share it through its query key, so they share one request per window. While another window loads, it keeps the previous window's matrix as placeholder data, when that matrix has decks, §4.8.
 *
 * @param timeWindow - The window to read.
 * @returns The query for the window's matrix.
 */
export function useMatchups(
  timeWindow: TimeWindow,
): UseQueryResult<MatchupMatrix> {
  return useQuery({
    queryKey: ["matchups", timeWindow],
    queryFn: ({ signal }) => fetchMatchups(timeWindow, signal),
    retry: false,
    placeholderData: (previous) =>
      previous?.decks.length ? previous : undefined,
  });
}
