import i18next from "i18next";
import { describe, expect, it } from "vitest";
import locales from "./locales.json";
import type { Locales, Translation } from "./i18n";

type Lacking = Omit<Translation, "common"> & {
  common: Omit<Translation["common"], "retry">;
};

describe("i18n", () => {
  it("reads the strings of the file in English", () => {
    expect(i18next.language).toBe("en");
    expect(i18next.t("common.retry")).toBe("Retry");
  });

  it("fills a placeholder", () => {
    expect(i18next.t("common.range", { from: "5 Sept", to: "9 Oct" })).toBe(
      "5 Sept to 9 Oct",
    );
  });

  it("writes the value of a placeholder without escaping it, since React escapes", () => {
    expect(i18next.t("common.range", { from: "<1%", to: "R&D" })).toBe(
      "<1% to R&D",
    );
  });

  it("falls back to English for a key that another language lacks", async () => {
    i18next.addResourceBundle("xx", "translation", { common: {} });
    await i18next.changeLanguage("xx");

    try {
      expect(i18next.t("common.retry")).toBe("Retry");
    } finally {
      await i18next.changeLanguage("en");
      i18next.removeResourceBundle("xx", "translation");
    }
  });
});

describe("the type check of the strings", () => {
  it("holds every key of English in every language of the file", () => {
    const check: Locales = locales;

    expect(check).toBe(locales);
  });

  it("refuses a language that lacks a key of English", () => {
    const lacking: Lacking = locales.en.translation;

    // @ts-expect-error A language that lacks `common.retry` fails the build.
    const check: Translation = lacking;

    expect(check).toBe(lacking);
  });

  it("refuses an unknown key", () => {
    // @ts-expect-error A key that is not in the file fails the build.
    expect(i18next.t("common.noSuchKey")).toBe("common.noSuchKey");
  });
});
