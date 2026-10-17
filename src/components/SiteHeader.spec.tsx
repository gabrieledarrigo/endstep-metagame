import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("links the site name to the overview with the current window, beside the page navigation and the theme toggle", () => {
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
    expect(screen.getByRole("navigation", { name: "Pages" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Dark theme", pressed: false }),
    ).toBeTruthy();
  });
});
