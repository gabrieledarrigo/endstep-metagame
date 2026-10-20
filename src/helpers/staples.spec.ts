import { describe, expect, it } from "vitest";
import type { StapleDeck } from "../api/types";
import { coreText } from "./staples";

function deck(name: string, playRate: number): StapleDeck {
  return { slug: name.toLowerCase(), name, playRate, copies: 4 };
}

describe("coreText", () => {
  it("says a card is core nowhere when no deck plays it in half its lists", () => {
    expect(coreText([deck("Affinity", 0.49), deck("Elves", 0.2)])).toBe(
      "Not core in any deck",
    );
    expect(coreText([])).toBe("Not core in any deck");
  });

  it("names the one deck that plays it in exactly half its lists", () => {
    expect(coreText([deck("Affinity", 0.5), deck("Elves", 0.3)])).toBe(
      "Core in Affinity",
    );
  });

  it("joins two decks with and", () => {
    expect(coreText([deck("Affinity", 0.9), deck("Elves", 0.6)])).toBe(
      "Core in Affinity and Elves",
    );
  });

  it("joins three decks with a comma and and", () => {
    expect(
      coreText([
        deck("Affinity", 0.9),
        deck("Elves", 0.6),
        deck("Bogles", 0.5),
      ]),
    ).toBe("Core in Affinity, Elves and Bogles");
  });

  it("names the first two of more than three decks and counts the rest", () => {
    expect(
      coreText([
        deck("Affinity", 1),
        deck("Elves", 0.9),
        deck("Bogles", 0.8),
        deck("Stompy", 0.7),
        deck("Faeries", 0.06),
      ]),
    ).toBe("Core in Affinity, Elves and 2 more");
  });

  it("orders the decks by the share of their lists that play the card", () => {
    expect(
      coreText([
        deck("Elves", 0.6),
        deck("Affinity", 0.9),
        deck("Bogles", 0.7),
      ]),
    ).toBe("Core in Affinity, Bogles and Elves");
  });
});
