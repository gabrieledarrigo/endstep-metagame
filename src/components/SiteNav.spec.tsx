import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteNav } from "./SiteNav";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteNav />
    </MemoryRouter>,
  );

  return {
    overview: screen.getByRole("link", { name: "Overview" }),
    matchups: screen.getByRole("link", { name: "Matchups" }),
  };
}

describe("SiteNav", () => {
  it("links to the overview and the matchup table with the current window", () => {
    const { overview, matchups } = renderAt(
      "/decks/affinity-e93f5f74?window=7d",
    );

    expect(overview.getAttribute("href")).toBe("/?window=7d");
    expect(matchups.getAttribute("href")).toBe("/matchups?window=7d");
  });

  it("marks the overview as the current page", () => {
    const { overview, matchups } = renderAt("/?window=30d");

    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(matchups.getAttribute("aria-current")).toBeNull();
  });

  it("marks the matchup table as the current page", () => {
    const { overview, matchups } = renderAt("/matchups?window=30d");

    expect(overview.getAttribute("aria-current")).toBeNull();
    expect(matchups.getAttribute("aria-current")).toBe("page");
  });

  it("marks no page on a deck page", () => {
    const { overview, matchups } = renderAt(
      "/decks/affinity-e93f5f74?window=30d",
    );

    expect(overview.getAttribute("aria-current")).toBeNull();
    expect(matchups.getAttribute("aria-current")).toBeNull();
  });
});
