import { describe, expect, it } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import type { MatchupCell, MatchupMatrix } from "../api/types";
import {
  type RankedDeck,
  pickDecks,
  rangeScale,
  rankDecks,
} from "./expectedRate";

const fixture = matrix as MatchupMatrix;

function ranged(rate: number, low: number, high: number): MatchupCell {
  return { wins: 60, losses: 40, matches: 100, gate: null, rate, low, high };
}

function gated(): MatchupCell {
  return {
    wins: 8,
    losses: 10,
    matches: 18,
    gate: "too_few",
    rate: null,
    low: null,
    high: null,
  };
}

function matrixOf(
  slugs: string[],
  cells: MatchupMatrix["cells"],
): MatchupMatrix {
  return {
    window: { from: "2026-09-19", to: "2026-10-19" },
    decks: slugs.map((slug) => ({
      id: slug,
      slug,
      name: slug,
      colours: [],
      share: 0,
    })),
    cells,
  };
}

function sharesOf(m: MatchupMatrix): Record<string, number> {
  return Object.fromEntries(m.decks.map((deck) => [deck.slug, deck.share]));
}

function summary(ranking: RankedDeck[]): [string, number, number, number][] {
  return ranking.map((entry) => [
    entry.deck.slug,
    entry.rate,
    entry.low,
    entry.high,
  ]);
}

function entry(slug: string, low: number, high: number): RankedDeck {
  return {
    deck: { id: slug, slug, name: slug, colours: [], share: 0.1 },
    rate: (low + high) / 2,
    low,
    high,
    verdict: "neutral",
  };
}

function names(pick: {
  decks: RankedDeck[];
  more: number;
}): [string[], number] {
  return [pick.decks.map((item) => item.deck.slug), pick.more];
}

describe("rankDecks", () => {
  it("weighs each opponent by its part of the metagame's total share, by hand from the fixture", () => {
    const ranking = rankDecks(fixture, sharesOf(fixture));
    const affinity = ranking[0];
    const total = 0.0939 + 0.0681 + 0.047 + 0.012;
    const rate =
      (0.0939 * 0.5 + 0.0681 * 0.5707 + 0.047 * 0.476 + 0.012 * 0.5) / total;
    const spread =
      (1.96 / total) *
      Math.sqrt(
        (0.0681 * ((0.6025 - 0.5384) / 3.92)) ** 2 +
          (0.047 * ((0.5152 - 0.437) / 3.92)) ** 2 +
          (0.012 * 0.25) ** 2,
      );

    expect(affinity.deck.name).toBe("Affinity");
    expect(affinity.rate).toBeCloseTo(rate, 12);
    expect(affinity.low).toBeCloseTo(rate - spread, 12);
    expect(affinity.high).toBeCloseTo(rate + spread, 12);
    expect([affinity.rate, affinity.low, affinity.high]).toEqual([
      expect.closeTo(0.5167, 4),
      expect.closeTo(0.4871, 4),
      expect.closeTo(0.5463, 4),
    ]);
    expect(ranking.map((item) => item.deck.name)).toEqual([
      "Affinity",
      "Monster Tron",
      "Naya Gates",
      "Mono Red Madness",
    ]);
  });

  it("counts the mirror as 50% with no error, and calls a range clearly above or below 50%", () => {
    const ranking = rankDecks(
      matrixOf(["a", "b"], {
        a: { b: ranged(0.6, 0.55, 0.65) },
        b: { a: ranged(0.4, 0.35, 0.45) },
      }),
      { a: 0.6, b: 0.4 },
    );

    expect(summary(ranking)).toEqual([
      [
        "a",
        expect.closeTo(0.54, 12),
        expect.closeTo(0.52, 12),
        expect.closeTo(0.56, 12),
      ],
      [
        "b",
        expect.closeTo(0.44, 12),
        expect.closeTo(0.41, 12),
        expect.closeTo(0.47, 12),
      ],
    ]);
    expect(ranking.map((item) => item.verdict)).toEqual(["win", "loss"]);
  });

  it("counts a gated pair as 50% with an error of 0.25", () => {
    const ranking = rankDecks(
      matrixOf(["a", "b"], { a: { b: gated() }, b: { a: gated() } }),
      { a: 0.6, b: 0.4 },
    );

    expect(summary(ranking)).toEqual([
      [
        "a",
        expect.closeTo(0.5, 12),
        expect.closeTo(0.304, 12),
        expect.closeTo(0.696, 12),
      ],
      [
        "b",
        expect.closeTo(0.5, 12),
        expect.closeTo(0.206, 12),
        expect.closeTo(0.794, 12),
      ],
    ]);
    expect(ranking.map((item) => item.verdict)).toEqual(["neutral", "neutral"]);
  });

  it("counts a pair with no entry as 50% with an error of 0.25", () => {
    const ranking = rankDecks(matrixOf(["a", "b"], {}), { a: 0.6, b: 0.4 });

    expect(summary(ranking)).toEqual([
      [
        "a",
        expect.closeTo(0.5, 12),
        expect.closeTo(0.304, 12),
        expect.closeTo(0.696, 12),
      ],
      [
        "b",
        expect.closeTo(0.5, 12),
        expect.closeTo(0.206, 12),
        expect.closeTo(0.794, 12),
      ],
    ]);
  });

  it("gives an opponent at zero share no weight and no error, and still ranks the deck itself", () => {
    const ranking = rankDecks(
      matrixOf(["a", "b", "c"], {
        a: { b: ranged(0.9, 0.85, 0.95), c: gated() },
        b: { a: ranged(0.1, 0.05, 0.15) },
      }),
      { a: 1, b: 0 },
    );

    expect(summary(ranking)).toEqual([
      ["a", 0.5, 0.5, 0.5],
      ["c", 0.5, expect.closeTo(0.01, 12), expect.closeTo(0.99, 12)],
      [
        "b",
        expect.closeTo(0.1, 12),
        expect.closeTo(0.05, 12),
        expect.closeTo(0.15, 12),
      ],
    ]);
  });

  it("keeps decks with the same rate in share order", () => {
    const ranking = rankDecks(
      matrixOf(["x", "y", "z"], {
        z: { x: ranged(0.6, 0.5, 0.7), y: ranged(0.6, 0.5, 0.7) },
      }),
      { x: 0.4, y: 0.3, z: 0.3 },
    );

    expect(ranking.map((item) => item.deck.slug)).toEqual(["z", "x", "y"]);
    expect(ranking[1].rate).toBe(ranking[2].rate);
  });

  it("keeps the range between 0% and 100%", () => {
    const ranking = rankDecks(
      matrixOf(["a", "b"], {
        b: { a: ranged(0.95, 0.85, 1) },
        a: { b: ranged(0.05, 0, 0.15) },
      }),
      { a: 1 },
    );

    expect(summary(ranking)).toEqual([
      ["b", 0.95, expect.closeTo(0.875, 12), 1],
      ["a", 0.5, 0.5, 0.5],
    ]);
  });
});

describe("pickDecks", () => {
  it("picks the best deck alone when no other deck's range reaches into its own", () => {
    expect(
      names(pickDecks([entry("a", 0.56, 0.59), entry("b", 0.53, 0.55)])),
    ).toEqual([["a"], 0]);
  });

  it("does not count a deck whose top only touches the best deck's bottom", () => {
    expect(
      names(pickDecks([entry("a", 0.56, 0.59), entry("b", 0.53, 0.56)])),
    ).toEqual([["a"], 0]);
  });

  it("picks two decks when the second is too close to the best", () => {
    expect(
      names(
        pickDecks([
          entry("a", 0.56, 0.59),
          entry("b", 0.54, 0.57),
          entry("c", 0.52, 0.55),
        ]),
      ),
    ).toEqual([["a", "b"], 0]);
  });

  it("picks three decks at most, and counts the others just as close", () => {
    expect(
      names(
        pickDecks([
          entry("a", 0.52, 0.6),
          entry("b", 0.51, 0.59),
          entry("c", 0.5, 0.58),
          entry("d", 0.49, 0.57),
          entry("e", 0.48, 0.56),
          entry("f", 0.4, 0.5),
        ]),
      ),
    ).toEqual([["a", "b", "c"], 2]);
  });

  it("stops at the first deck that is not too close, even when a wider deck below it is", () => {
    expect(
      names(
        pickDecks([
          entry("spy", 0.557, 0.596),
          entry("rally", 0.514, 0.554),
          entry("aggro", 0.502, 0.564),
          entry("blade", 0.469, 0.564),
        ]),
      ),
    ).toEqual([["spy"], 0]);
  });

  it("picks three decks and one more from the fixture", () => {
    const pick = pickDecks(rankDecks(fixture, sharesOf(fixture)));

    expect(pick.decks.map((item) => item.deck.name)).toEqual([
      "Affinity",
      "Monster Tron",
      "Naya Gates",
    ]);
    expect(pick.more).toBe(1);
  });

  it("picks nothing from an empty ranking", () => {
    expect(pickDecks([])).toEqual({ decks: [], more: 0 });
  });
});

describe("rangeScale", () => {
  it("rounds the lowest and the highest bound out to 5 points", () => {
    expect(rangeScale([{ low: 0.2225, high: 0.7775 }])).toEqual({
      min: 0.2,
      max: 0.8,
    });
  });

  it("keeps a bound that already sits on 5 points", () => {
    expect(
      rangeScale([
        { low: 0.45, high: 0.5 },
        { low: 0.5, high: 0.55 },
      ]),
    ).toEqual({ min: 0.45, max: 0.55 });
  });

  it("always holds 50%", () => {
    expect(rangeScale([{ low: 0.52, high: 0.58 }])).toEqual({
      min: 0.5,
      max: 0.6,
    });
    expect(rangeScale([{ low: 0.41, high: 0.47 }])).toEqual({
      min: 0.4,
      max: 0.5,
    });
  });
});
