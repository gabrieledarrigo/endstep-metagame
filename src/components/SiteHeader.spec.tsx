import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("links the site name to the overview with the current window, beside the three page links and the theme toggle", () => {
    render(
      <MemoryRouter initialEntries={["/matchups?window=14d"]}>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole("link", { name: "Pauper Endstep metagame" })
        .getAttribute("href"),
    ).toBe("/?window=14d");
    expect(
      within(screen.getByRole("navigation", { name: "Pages" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Overview", "Matchups", "What to play?"]);
    expect(
      screen.getByRole("button", { name: "Dark theme", pressed: false }),
    ).toBeTruthy();
  });

  it("holds the hidden site mark before the name, in the brand link", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    const brand = screen.getByRole("link", {
      name: "Pauper Endstep metagame",
    });
    const mark = brand.querySelector("svg");

    expect(brand.firstChild).toBe(mark);
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.getAttribute("class")).toBe("site-mark site-header__mark");
    expect(brand.textContent).toBe("Pauper Endstep metagame");
  });
});
