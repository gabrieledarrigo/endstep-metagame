import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { fetchMatchups } from "../api/endpoints";
import type { MatchupMatrix, TimeWindow } from "../api/types";

/**
 * Reads the matchup matrix of a window, with no automatic retry, FR-12.
 *
 * The matchup page and the deck page share it through its query key, so they share one request per window.
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
  });
}
