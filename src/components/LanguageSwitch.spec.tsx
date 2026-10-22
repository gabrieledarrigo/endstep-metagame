import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "./LanguageSwitch";

function select(name = "Language"): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>("combobox", { name });
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.doUnmock("../locales/locales.json");
  vi.resetModules();
  await import("../locales/i18n");
});

describe("LanguageSwitch", () => {
  it("shows the code of the language and names each option in its own words", () => {
    const { container } = render(<LanguageSwitch />);

    expect(container.querySelector(".lang-switch__code")?.textContent).toBe(
      "EN",
    );
    expect(select().value).toBe("en");
    expect(
      [...select().options].map((option) => [option.value, option.text]),
    ).toEqual([
      ["en", "English"],
      ["it", "Italiano"],
      ["es", "Español"],
      ["pt", "Português"],
    ]);
  });

  it("changes the language at once, sets the lang attribute and keeps the choice", () => {
    const { container } = render(<LanguageSwitch />);

    fireEvent.change(select(), { target: { value: "it" } });

    expect(select("Lingua").value).toBe("it");
    expect(container.querySelector(".lang-switch__code")?.textContent).toBe(
      "IT",
    );
    expect(document.documentElement.lang).toBe("it-IT");
    expect(localStorage.getItem("language")).toBe("it");
  });

  it("still changes the language when storage refuses the choice", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is full");
    });
    render(<LanguageSwitch />);

    fireEvent.change(select(), { target: { value: "pt" } });

    expect(select("Idioma").value).toBe("pt");
  });

  it("shows nothing when the file holds one language", async () => {
    vi.resetModules();
    vi.doMock("../locales/locales.json", async (original) => {
      const { en } = await original<typeof import("../locales/locales.json")>();

      return { default: { en } };
    });
    await import("../locales/i18n");
    const { LanguageSwitch: OneLanguage } = await import("./LanguageSwitch");

    const { container } = render(<OneLanguage />);

    expect(container.innerHTML).toBe("");
  });
});
