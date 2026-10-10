import { describe, expect, it } from "vitest";
import type { MatchupCell, MatchupMatrix } from "../../api/types";
import { cellOf, cellState, cellSummary, isClearPair } from "./cellState";

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

  it("gives only the verdict of a cell without a rate", () => {
    expect(
      cellSummary("Affinity", "Naya Gates", "gated", CELLS.affinity.gates),
    ).toBe("Affinity against Naya Gates: too few to call");
    expect(cellSummary("Affinity", "Elves", "none", undefined)).toBe(
      "Affinity against Elves: no data",
    );
    expect(cellSummary("Affinity", "Affinity", "mirror", undefined)).toBe(
      "Affinity against Affinity: mirror match",
    );
  });
});
