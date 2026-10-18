import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteNav } from "./SiteNav";

function renderAt(path: string): {
  overview: HTMLElement;
  matchups: HTMLElement;
  whatToPlay: HTMLElement;
} {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteNav />
    </MemoryRouter>,
  );

  return {
    overview: screen.getByRole("link", { name: "Overview" }),
    matchups: screen.getByRole("link", { name: "Matchups" }),
    whatToPlay: screen.getByRole("link", { name: "What to play?" }),
  };
}

describe("SiteNav", () => {
  it("links to the overview, the matchup table and What to play? with the current window", () => {
    const { overview, matchups, whatToPlay } = renderAt(
      "/decks/affinity-e93f5f74?window=7d",
    );

    expect(overview.getAttribute("href")).toBe("/?window=7d");
    expect(matchups.getAttribute("href")).toBe("/matchups?window=7d");
    expect(whatToPlay.getAttribute("href")).toBe("/what-to-play?window=7d");
  });

  it("links to What to play? with the window alone, whatever else the address holds", () => {
    const { whatToPlay } = renderAt(
      "/what-to-play?window=14d&meta=affinity-e93f5f74:-4&beat=elves-262fdcbd",
    );

    expect(whatToPlay.getAttribute("href")).toBe("/what-to-play?window=14d");
  });

  it("marks the overview as the current page", () => {
    const { overview, matchups, whatToPlay } = renderAt("/?window=30d");

    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(matchups.getAttribute("aria-current")).toBeNull();
    expect(whatToPlay.getAttribute("aria-current")).toBeNull();
  });

  it("marks the matchup table as the current page", () => {
    const { overview, matchups } = renderAt("/matchups?window=30d");

    expect(overview.getAttribute("aria-current")).toBeNull();
    expect(matchups.getAttribute("aria-current")).toBe("page");
  });

  it("marks the matchup table as the current page under a trailing slash", () => {
    const { matchups } = renderAt("/matchups/?window=30d");

    expect(matchups.getAttribute("aria-current")).toBe("page");
  });

  it("marks What to play? as the current page", () => {
    const { overview, matchups, whatToPlay } = renderAt(
      "/what-to-play?window=30d",
    );

    expect(overview.getAttribute("aria-current")).toBeNull();
    expect(matchups.getAttribute("aria-current")).toBeNull();
    expect(whatToPlay.getAttribute("aria-current")).toBe("page");
  });

  it("marks no page on a deck page", () => {
    const { overview, matchups, whatToPlay } = renderAt(
      "/decks/affinity-e93f5f74?window=30d",
    );

    expect(overview.getAttribute("aria-current")).toBeNull();
    expect(matchups.getAttribute("aria-current")).toBeNull();
    expect(whatToPlay.getAttribute("aria-current")).toBeNull();
  });

  it("takes an extra class from the header", () => {
    render(
      <MemoryRouter initialEntries={["/?window=30d"]}>
        <SiteNav className="site-header__nav" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Pages" }).className).toBe(
      "site-nav site-header__nav",
    );
  });
});
