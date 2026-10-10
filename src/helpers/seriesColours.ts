import { token } from "../charts/theme";

const SERIES_COLOURS = [
  "--s1",
  "--s2",
  "--s3",
  "--s4",
  "--s5",
  "--s6",
  "--s7",
  "--s8",
].map(token);

const seriesSlots = new Map<string, number>();

/**
 * Gives each series a palette colour that stays with it between calls, so a deck keeps its colour when the window changes.
 *
 * A key keeps its earlier slot unless another key in the same call already holds it. A key without a slot takes the lowest free one.
 *
 * @param keys - The series keys. The palette has eight colours.
 * @returns A map from each key to its colour.
 */
export function seriesColours(keys: string[]): Map<string, string> {
  const taken = new Set<number>();
  const unplaced: string[] = [];
  const colours = new Map<string, string>();

  keys.forEach((key) => {
    const slot = seriesSlots.get(key);
    if (slot === undefined || taken.has(slot)) {
      unplaced.push(key);
    } else {
      taken.add(slot);
      colours.set(key, SERIES_COLOURS[slot]);
    }
  });

  let free = 0;
  unplaced.forEach((key) => {
    while (taken.has(free)) {
      free += 1;
    }
    taken.add(free);
    seriesSlots.set(key, free);
    colours.set(key, SERIES_COLOURS[free]);
  });

  return colours;
}
