import type { Population, TimeWindow } from "./api/types";

export const SITE_NAME = "Pauper Endstep metagame";
export const FORMAT = "Pauper";
export const POPULATION: Population = "rated";
export const WINDOWS: readonly TimeWindow[] = [
  "1d",
  "7d",
  "14d",
  "30d",
  "season",
];
export const DEFAULT_WINDOW: TimeWindow = "30d";
export const PAGE_SIZE = 24;
