import { FORMAT, PAGE_SIZE, POPULATION } from "../config";
import { getJson } from "./client";
import type { DecksResponse, ShareSeriesResponse, TimeWindow } from "./types";

/**
 * Fetches the top decks of a window, sorted by meta share.
 *
 * @param timeWindow - The window to read.
 * @param signal - Aborts the request.
 * @returns A Promise resolving to the first page of `PAGE_SIZE` decks, with the window's totals and provenance.
 * @throws The errors `getJson` throws.
 */
export function fetchDecks(timeWindow: TimeWindow, signal: AbortSignal) {
  return getJson<DecksResponse>(
    `${FORMAT}/decks`,
    {
      window: timeWindow,
      population: POPULATION,
      sort: "share",
      dir: "desc",
      page: "1",
      pageSize: String(PAGE_SIZE),
    },
    signal,
  );
}

/**
 * Fetches the daily meta share of the top eight decks in a window.
 *
 * @param timeWindow - The window to read.
 * @param signal - Aborts the request.
 * @returns A Promise resolving to one series per deck, with a point for every day of the window.
 * @throws The errors `getJson` throws.
 */
export function fetchSeries(timeWindow: TimeWindow, signal: AbortSignal) {
  return getJson<ShareSeriesResponse>(
    `${FORMAT}/share-series`,
    { window: timeWindow, population: POPULATION },
    signal,
  );
}
