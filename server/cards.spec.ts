import { describe, expect, it } from "vitest";
import { BASICS, SNOW_COVERED_BASICS, frontOf, nameKey } from "./cards.js";

describe("frontOf", () => {
  it.each([
    ["Fire // Ice", "Fire"],
    ["Tithing Blade // Consuming Sepulcher", "Tithing Blade"],
    ["Counterspell", "Counterspell"],
    ["Who // What // When // Where // Why", "Who"],
  ])("takes %j to %j", (name, front) => {
    expect(frontOf(name)).toBe(front);
  });
});

describe("nameKey", () => {
  it.each([
    ["Snow-Covered Island", "snow-covered island"],
    ["Lim-Dûl's Vault", "lim-dûl's vault"],
    ["counterspell", "counterspell"],
  ])("keys %j as %j", (name, key) => {
    expect(nameKey(name)).toBe(key);
  });
});

describe("SNOW_COVERED_BASICS", () => {
  it("holds the snow-covered version of each basic land, in the same order", () => {
    expect(SNOW_COVERED_BASICS).toEqual(
      BASICS.map((name) => `snow-covered ${name}`),
    );
  });
});
