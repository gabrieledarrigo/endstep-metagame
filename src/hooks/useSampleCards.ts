import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { fetchSampleCards } from "../api/endpoints";
import type { SampleCardsResponse, TimeWindow } from "../api/types";

/**
 * Reads the images and prices of a deck's sample list for a window, with no automatic retry, FR-19.
 *
 * The deck page asks for it once the deck detail has a list to show. While another key loads, it keeps the same deck's previous cards as placeholder data, §4.8.
 *
 * @param slug - The deck's slug.
 * @param timeWindow - The window of the list on screen.
 * @param enabled - Whether there is a list to read the cards of.
 * @returns The query for the list's cards.
 */
export function useSampleCards(
  slug: string,
  timeWindow: TimeWindow,
  enabled: boolean,
): UseQueryResult<SampleCardsResponse> {
  return useQuery({
    queryKey: ["sample-cards", slug, timeWindow],
    queryFn: ({ signal }) => fetchSampleCards(slug, timeWindow, signal),
    retry: false,
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === slug ? previous : undefined,
  });
}
