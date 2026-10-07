import { FORMAT, PAGE_SIZE, POPULATION } from "../config";
import { getJson } from "./client";

export function fetchDecks(timeWindow, signal) {
  return getJson(
    `${FORMAT}/decks`,
    {
      window: timeWindow,
      population: POPULATION,
      sort: "share",
      dir: "desc",
      page: 1,
      pageSize: PAGE_SIZE,
    },
    signal,
  );
}

export function fetchSeries(timeWindow, signal) {
  return getJson(
    `${FORMAT}/share-series`,
    { window: timeWindow, population: POPULATION },
    signal,
  );
}
