export const BASICS = [
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
];
export const SNOW_COVERED_BASICS = [
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
  "snow-covered wastes",
];

/**
 * Builds the memory key of a card name. Scryfall matches names ignoring case, §3.4.
 *
 * @param name - A card name, or one face's name.
 * @returns The name in lower case.
 */
export function nameKey(name: string): string {
  return name.toLowerCase();
}

/**
 * Takes the first half of a card name with two halves, "Front // Back". Scryfall's collection does not find a split card by its full name, §4.10.
 *
 * @param name - A card name, in the spelling Endstep sent.
 * @returns The part before " // ", or the whole name when it has one part.
 */
export function frontOf(name: string): string {
  return name.split(" // ")[0];
}
