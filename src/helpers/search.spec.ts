import { describe, expect, it } from "vitest";
import { quoted, searchTerm } from "./search";

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

describe("quoted", () => {
  it("puts the term in curly quotes", () => {
    expect(quoted("altar tron")).toBe("\u201caltar tron\u201d");
  });
});
