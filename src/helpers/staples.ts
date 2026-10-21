import i18next from "i18next";
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
    return i18next.t("helpers.staples.none");
  }

  if (names.length === 1) {
    return i18next.t("helpers.staples.one", { deck: names[0] });
  }

  if (names.length > 3) {
    return i18next.t("helpers.staples.more", {
      first: names[0],
      second: names[1],
      count: names.length - 2,
    });
  }

  return i18next.t("helpers.staples.list", {
    decks: names.slice(0, -1).join(", "),
    last: names.at(-1),
  });
}
