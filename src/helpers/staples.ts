import type { StapleDeck } from "../api/types";

const CORE = 0.5;

/**
 * Names the decks where a staple is core: at least half of their lists play it, FR-18.
 *
 * @param decks - The decks behind the card, as the staples function returns them.
 * @returns The core decks by the share of their lists that play the card, such as `Core in Affinity, Dimir Control and 3 more`, or `Not core in any deck`.
 */
export function coreText(decks: StapleDeck[]): string {
  const names = decks
    .filter((deck) => deck.playRate >= CORE)
    .toSorted((a, b) => b.playRate - a.playRate)
    .map((deck) => deck.name);

  if (names.length === 0) {
    return "Not core in any deck";
  }

  if (names.length === 1) {
    return `Core in ${names[0]}`;
  }

  if (names.length > 3) {
    return `Core in ${names[0]}, ${names[1]} and ${names.length - 2} more`;
  }

  return `Core in ${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
