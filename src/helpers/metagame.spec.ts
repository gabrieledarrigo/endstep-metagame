import { describe, expect, it } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import type { MatrixDeck } from "../api/types";
import { canStep, metagameShares, readMeta, writeMeta } from "./metagame";

const DECKS = matrix.decks as MatrixDeck[];
const AFFINITY = "affinity-e93f5f74";
const MADNESS = "mono-red-madness-60596e8a";
const TRON = "monster-tron-1bc68613";
const GATES = "naya-gates-af060ab8";

function deck(slug: string, share: number): MatrixDeck {
  return { id: slug, slug, name: slug, colours: [], share };
}

describe("readMeta", () => {
  it("reads nothing from an address without changes", () => {
    expect(readMeta(null, DECKS)).toEqual({});
    expect(readMeta("", DECKS)).toEqual({});
  });

  it("reads raises with no sign and lowers with a minus sign, in whole points", () => {
    expect(readMeta(`${AFFINITY}:-4,${TRON}:3`, DECKS)).toEqual({
      [AFFINITY]: -4,
      [TRON]: 3,
    });
  });

  it("matches a deck by its slug's suffix, and keys it by its current slug", () => {
    expect(readMeta("old-name-e93f5f74:2", DECKS)).toEqual({ [AFFINITY]: 2 });
  });

  it("ignores an entry it cannot read, and keeps the rest", () => {
    const entries = [
      AFFINITY,
      `${AFFINITY}:`,
      `${AFFINITY}:1.5`,
      `${AFFINITY}: 3`,
      `${AFFINITY}:+3`,
      `${AFFINITY}:-`,
      `${AFFINITY}:1000`,
      ":3",
      "",
      `${TRON}:2`,
    ];

    expect(readMeta(entries.join(","), DECKS)).toEqual({ [TRON]: 2 });
  });

  it("ignores a change of zero or outside −100 to 100", () => {
    expect(
      readMeta(`${AFFINITY}:0,${MADNESS}:-0,${TRON}:101,${GATES}:-101`, DECKS),
    ).toEqual({});
    expect(readMeta(`${AFFINITY}:100,${TRON}:-100`, DECKS)).toEqual({
      [AFFINITY]: 100,
      [TRON]: -5,
    });
  });

  it("ignores a deck outside the window's decks", () => {
    expect(readMeta(`elves-262fdcbd:3,${TRON}:1`, DECKS)).toEqual({
      [TRON]: 1,
    });
  });

  it("keeps the first entry for a deck and ignores a repeat", () => {
    expect(readMeta(`${AFFINITY}:2,old-name-e93f5f74:5`, DECKS)).toEqual({
      [AFFINITY]: 2,
    });
  });

  it("counts a change past zero as the share rounded up", () => {
    expect(readMeta(`${GATES}:-5`, DECKS)).toEqual({ [GATES]: -2 });
    expect(readMeta(`${GATES}:-2`, DECKS)).toEqual({ [GATES]: -2 });
  });

  it("rounds a share of whole points up to itself", () => {
    const decks = [deck("a-11111111", 0.07), deck("b-22222222", 0.29)];

    expect(readMeta("a-11111111:-9,b-22222222:-30", decks)).toEqual({});
    expect(readMeta("a-11111111:-9", decks)).toEqual({ "a-11111111": -7 });
  });

  it("ignores every change when they would leave every share at zero", () => {
    expect(
      readMeta(`${AFFINITY}:-10,${MADNESS}:-7,${TRON}:-5,${GATES}:-2`, DECKS),
    ).toEqual({});
  });
});

describe("writeMeta", () => {
  it("writes the changed decks in share order, with no sign on a raise", () => {
    expect(writeMeta({ [TRON]: 3, [AFFINITY]: -4 }, DECKS)).toBe(
      `${AFFINITY}:-4,${TRON}:3`,
    );
  });

  it("leaves out a change of zero and a deck outside the window's decks", () => {
    expect(
      writeMeta({ [AFFINITY]: 0, "elves-262fdcbd": 3, [GATES]: -1 }, DECKS),
    ).toBe(`${GATES}:-1`);
  });

  it("writes nothing when nothing has changed", () => {
    expect(writeMeta({}, DECKS)).toBe("");
  });
});

describe("metagameShares", () => {
  it("moves each share by its change in points", () => {
    expect(metagameShares(DECKS, { [AFFINITY]: 3, [MADNESS]: -1 })).toEqual({
      [AFFINITY]: 0.1239,
      [MADNESS]: 0.0581,
      [TRON]: 0.047,
      [GATES]: 0.012,
    });
  });

  it("never takes a share below zero", () => {
    expect(metagameShares(DECKS, { [GATES]: -2 })[GATES]).toBe(0);
  });
});

describe("canStep", () => {
  it("lets More act until the change is 100 points", () => {
    expect(canStep(DECKS, {}, AFFINITY, 1)).toBe(true);
    expect(canStep(DECKS, { [AFFINITY]: 99 }, AFFINITY, 1)).toBe(true);
    expect(canStep(DECKS, { [AFFINITY]: 100 }, AFFINITY, 1)).toBe(false);
  });

  it("lets Less act on a share above zero", () => {
    expect(canStep(DECKS, {}, GATES, -1)).toBe(true);
    expect(canStep(DECKS, { [GATES]: -1 }, GATES, -1)).toBe(true);
  });

  it("stops Less at zero", () => {
    expect(canStep(DECKS, { [GATES]: -2 }, GATES, -1)).toBe(false);
  });

  it("stops Less on the last deck above zero", () => {
    const changes = { [MADNESS]: -7, [TRON]: -5, [GATES]: -2 };

    expect(canStep(DECKS, changes, AFFINITY, -1)).toBe(false);
    expect(canStep(DECKS, changes, AFFINITY, 1)).toBe(true);
    expect(canStep(DECKS, { [MADNESS]: -7, [TRON]: -5 }, AFFINITY, -1)).toBe(
      true,
    );
  });
});
