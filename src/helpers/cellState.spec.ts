import { describe, expect, it } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import type { MatchupCell, MatchupMatrix } from "../api/types";
import {
  cellOf,
  cellState,
  cellSummary,
  cellText,
  decksThatBeat,
  isClearPair,
} from "./cellState";

function ranged(
  wins: number,
  losses: number,
  low: number,
  high: number,
): MatchupCell {
  return {
    wins,
    losses,
    matches: wins + losses,
    gate: null,
    rate: wins / (wins + losses),
    low,
    high,
  };
}

function gated(wins: number, losses: number): MatchupCell {
  return {
    wins,
    losses,
    matches: wins + losses,
    gate: "too_few",
    rate: null,
    low: null,
    high: null,
  };
}

const CELLS: MatchupMatrix["cells"] = {
  affinity: {
    madness: ranged(831, 625, 0.538, 0.603),
    tron: ranged(475, 523, 0.437, 0.515),
    gates: gated(8, 10),
    walls: ranged(60, 40, 0.505, 0.69),
  },
  madness: {
    affinity: ranged(625, 831, 0.398, 0.461),
  },
  tron: {
    affinity: ranged(523, 475, 0.486, 0.562),
  },
  elves: {
    spy: ranged(240, 180, 0.502, 0.62),
    touching: ranged(55, 45, 0.5, 0.6),
  },
  spy: {
    elves: ranged(180, 240, 0.39, 0.5),
  },
  gates: {
    affinity: gated(10, 8),
  },
  walls: {},
};

describe("cellOf", () => {
  it("reads a record, or nothing when the pair has no entry in that direction", () => {
    expect(cellOf(CELLS, "affinity", "madness")?.wins).toBe(831);
    expect(cellOf(CELLS, "walls", "affinity")).toBeUndefined();
    expect(cellOf(CELLS, "unknown", "affinity")).toBeUndefined();
  });
});

describe("isClearPair", () => {
  it("is clear when both ranges exclude 50%, in both directions", () => {
    expect(isClearPair(CELLS, "affinity", "madness")).toBe(true);
    expect(isClearPair(CELLS, "madness", "affinity")).toBe(true);
  });

  it("is clear when the only range present excludes 50%", () => {
    expect(isClearPair(CELLS, "affinity", "walls")).toBe(true);
    expect(isClearPair(CELLS, "walls", "affinity")).toBe(true);
  });

  it("is not clear when one of the two ranges reaches 50%", () => {
    expect(isClearPair(CELLS, "elves", "spy")).toBe(false);
  });

  it("is not clear when a range ends exactly on 50%", () => {
    expect(isClearPair(CELLS, "elves", "touching")).toBe(false);
  });

  it("is not clear without a range", () => {
    expect(isClearPair(CELLS, "affinity", "gates")).toBe(false);
    expect(isClearPair(CELLS, "affinity", "elves")).toBe(false);
  });
});

describe("cellState", () => {
  it.each([
    ["affinity", "affinity", "mirror"],
    ["affinity", "elves", "none"],
    ["affinity", "gates", "gated"],
    ["gates", "affinity", "gated"],
    ["affinity", "madness", "win"],
    ["madness", "affinity", "loss"],
    ["affinity", "tron", "neutral"],
    ["elves", "spy", "neutral"],
    ["spy", "elves", "neutral"],
    ["affinity", "walls", "win"],
  ])("reads %s against %s as %s", (row, column, state) => {
    expect(cellState(CELLS, row, column)).toBe(state);
  });
});

describe("cellSummary", () => {
  it("gives the whole percentage and the verdict of a cell with a rate", () => {
    expect(
      cellSummary(
        "Affinity",
        "Mono Red Madness",
        "win",
        CELLS.affinity.madness,
      ),
    ).toBe("Affinity against Mono Red Madness: 57%, clear result");
    expect(
      cellSummary("Affinity", "Monster Tron", "neutral", CELLS.affinity.tron),
    ).toBe("Affinity against Monster Tron: 48%, within the range of chance");
  });

  it("gives the verdict of a cell without a rate, with the decided matches of a gated one", () => {
    expect(
      cellSummary("Affinity", "Naya Gates", "gated", CELLS.affinity.gates),
    ).toBe(
      "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
    );
    expect(cellSummary("Affinity", "Elves", "none", undefined)).toBe(
      "Affinity against Elves: no data",
    );
    expect(cellSummary("Affinity", "Affinity", "mirror", undefined)).toBe(
      "Affinity against Affinity: mirror match",
    );
  });
});

describe("cellText", () => {
  it("gives the whole percentage of a cell with a rate", () => {
    expect(cellText("win", CELLS.affinity.madness)).toBe("57");
    expect(cellText("loss", CELLS.madness.affinity)).toBe("43");
    expect(cellText("neutral", CELLS.affinity.tron)).toBe("48");
  });

  it("gives a dot for no data, and nothing for a gated cell or the mirror", () => {
    expect(cellText("none", undefined)).toBe("\u00b7");
    expect(cellText("gated", CELLS.affinity.gates)).toBe("");
    expect(cellText("mirror", undefined)).toBe("");
  });
});

describe("decksThatBeat", () => {
  const slugs = [
    "affinity",
    "madness",
    "tron",
    "gates",
    "walls",
    "elves",
    "spy",
    "storm",
  ];
  const beaten: MatchupMatrix = {
    window: { from: "2026-09-19", to: "2026-10-19" },
    decks: slugs.map((slug) => ({
      id: slug,
      slug,
      name: slug,
      colours: [],
      share: 0.1,
    })),
    cells: {
      affinity: {
        madness: ranged(625, 831, 0.398, 0.461),
        tron: ranged(475, 523, 0.437, 0.515),
        gates: gated(8, 10),
        walls: ranged(40, 60, 0.31, 0.495),
        elves: ranged(40, 60, 0.33, 0.47),
        spy: ranged(40, 60, 0.33, 0.47),
      },
      madness: { affinity: ranged(831, 625, 0.538, 0.603) },
      tron: { affinity: ranged(523, 475, 0.486, 0.562) },
      gates: { affinity: gated(10, 8) },
      walls: {},
      elves: { affinity: ranged(60, 40, 0.53, 0.67) },
      spy: { affinity: ranged(60, 40, 0.53, 0.67) },
      storm: { affinity: ranged(30, 70, 0.21, 0.4) },
    },
  };

  it("lists the decks whose pair with the deck is clear in their favour, highest rate first, ties in share order", () => {
    expect(
      decksThatBeat(beaten, "affinity").map((entry) => [
        entry.deck.slug,
        entry.rate,
        entry.low,
        entry.high,
      ]),
    ).toEqual([
      ["elves", 0.6, 0.53, 0.67],
      ["spy", 0.6, 0.53, 0.67],
      ["madness", 831 / 1456, 0.538, 0.603],
    ]);
  });

  it("leaves out a pair too close to call, a loss, a gated pair, the mirror and a deck with no cell against it", () => {
    const listed = decksThatBeat(beaten, "affinity").map(
      (entry) => entry.deck.slug,
    );

    expect(listed).not.toContain("tron");
    expect(listed).not.toContain("storm");
    expect(listed).not.toContain("gates");
    expect(listed).not.toContain("affinity");
    expect(listed).not.toContain("walls");
  });

  it("finds nothing for a deck that nothing clearly beats", () => {
    expect(decksThatBeat(beaten, "storm")).toEqual([]);
  });

  it("lists exactly the decks whose cell against the deck is clearly in their favour", () => {
    const fixture = matrix as MatchupMatrix;

    for (const target of fixture.decks) {
      const blue = fixture.decks
        .filter(
          (deck) => cellState(fixture.cells, deck.slug, target.slug) === "win",
        )
        .map((deck) => deck.slug)
        .sort();
      const listed = decksThatBeat(fixture, target.slug)
        .map((entry) => entry.deck.slug)
        .sort();

      expect(listed).toEqual(blue);
    }
  });
});
