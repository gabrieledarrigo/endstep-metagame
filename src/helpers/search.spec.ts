import { describe, expect, it } from "vitest";
import { matchText, quoted, searchTerm } from "./search";

describe("searchTerm", () => {
  it("trims the term, collapses its inner spaces and lowercases it", () => {
    expect(searchTerm("  Altar \t  TRON ")).toBe("altar tron");
  });

  it("keeps a term of 2 characters", () => {
    expect(searchTerm("el")).toBe("el");
  });

  it("returns null for fewer than 2 characters once normalised", () => {
    expect(searchTerm("a")).toBeNull();
    expect(searchTerm("  a  ")).toBeNull();
    expect(searchTerm("   ")).toBeNull();
    expect(searchTerm("")).toBeNull();
  });

  it("returns null when there is no term", () => {
    expect(searchTerm(null)).toBeNull();
  });
});

describe("matchText", () => {
  it("counts the decks and names the term", () => {
    expect(matchText(1234, "elf")).toEqual({
      count: "1,234 decks",
      rest: "match \u201celf\u201d.",
    });
  });

  it("speaks of one deck in the singular", () => {
    expect(matchText(1, "altar tron")).toEqual({
      count: "1 deck",
      rest: "matches \u201caltar tron\u201d.",
    });
  });
});

describe("quoted", () => {
  it("puts the term in curly quotes", () => {
    expect(quoted("altar tron")).toBe("\u201caltar tron\u201d");
  });
});
