import { afterEach, describe, expect, it, vi } from "vitest";
import { formatTag, preferredLanguage } from "./language";

const AVAILABLE = ["en", "it", "es", "pt"];

function prefer(...languages: string[]): void {
  vi.stubGlobal("navigator", { ...navigator, languages });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preferredLanguage", () => {
  it("takes the first preferred language that the file holds, by its primary code", () => {
    prefer("fr-FR", "pt-PT", "it-IT");

    expect(preferredLanguage(AVAILABLE)).toBe("pt");
  });

  it("reads the primary code whatever its case", () => {
    prefer("ES-mx");

    expect(preferredLanguage(AVAILABLE)).toBe("es");
  });

  it("falls back to English when the file holds no preferred language", () => {
    prefer("fr", "de-DE");

    expect(preferredLanguage(AVAILABLE)).toBe("en");
  });
});

describe("formatTag", () => {
  it("takes the browser's own tag for the language, region and all", () => {
    prefer("de-DE", "en-US", "en-GB");

    expect(formatTag("en")).toBe("en-US");
  });

  it.each([
    ["en", "en-GB"],
    ["it", "it-IT"],
    ["es", "es-ES"],
    ["pt", "pt-BR"],
  ])(
    "gives %s the tag %s when the browser does not prefer it",
    (language, tag) => {
      prefer("de-DE");

      expect(formatTag(language)).toBe(tag);
    },
  );

  it("gives a language it does not know the English tag", () => {
    prefer("de-DE");

    expect(formatTag("xx")).toBe("en-GB");
  });
});
