import { describe, expect, it } from "vitest";
import { findDeck, slugSuffix } from "./slug";

const decks = [
  { slug: "affinity-e93f5f74", name: "Affinity" },
  { slug: "mono-red-madness-60596e8a", name: "Mono Red Madness" },
];

describe("slugSuffix", () => {
  it("reads the 8 characters after the last hyphen", () => {
    expect(slugSuffix("affinity-e93f5f74")).toBe("e93f5f74");
    expect(slugSuffix("mono-red-madness-60596e8a")).toBe("60596e8a");
  });

  it("returns null when the slug does not end in 8 characters after a name", () => {
    expect(slugSuffix("affinity")).toBeNull();
    expect(slugSuffix("affinity-e93f5f7")).toBeNull();
    expect(slugSuffix("affinity-e93f5f744")).toBeNull();
    expect(slugSuffix("-e93f5f74")).toBeNull();
    expect(slugSuffix("")).toBeNull();
  });
});

describe("findDeck", () => {
  it("finds a deck by its current slug", () => {
    expect(findDeck(decks, "mono-red-madness-60596e8a")?.name).toBe(
      "Mono Red Madness",
    );
  });

  it("finds a deck under an old name by its suffix", () => {
    expect(findDeck(decks, "renamed-e93f5f74")?.name).toBe("Affinity");
  });

  it("finds nothing for another suffix or a slug without one", () => {
    expect(findDeck(decks, "affinity-00000000")).toBeUndefined();
    expect(findDeck(decks, "affinity")).toBeUndefined();
  });
});
