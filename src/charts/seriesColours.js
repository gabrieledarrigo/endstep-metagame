import { token } from "./theme";

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

const seriesSlots = new Map();

export function seriesColours(keys) {
  const taken = new Set();
  const unplaced = [];

  keys.forEach((key) => {
    const slot = seriesSlots.get(key);
    if (slot === undefined || taken.has(slot)) {
      unplaced.push(key);
    } else {
      taken.add(slot);
    }
  });

  let free = 0;
  unplaced.forEach((key) => {
    while (taken.has(free)) {
      free += 1;
    }
    taken.add(free);
    seriesSlots.set(key, free);
  });

  return new Map(
    keys.map((key) => [key, SERIES_COLOURS[seriesSlots.get(key)]]),
  );
}
