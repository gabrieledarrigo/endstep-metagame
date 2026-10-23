import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../test/fixtures/deck.json";
import decks from "../test/fixtures/decks.json";
import matrix from "../test/fixtures/matchups.json";
import sampleCards from "../test/fixtures/sample-cards.json";
import series from "../test/fixtures/share-series.json";
import staples from "../test/fixtures/staples.json";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.startsWith("/api/matchups")) {
          return Promise.resolve(Response.json(matrix));
        }

        if (url.startsWith("/api/staples")) {
          return Promise.resolve(Response.json(staples));
        }

        if (url.startsWith("/api/sample-cards")) {
          return Promise.resolve(Response.json(sampleCards));
        }

        const deck = decks.decks.items.find((item) =>
          url.includes(`/decks/${item.slug}`),
        );

        if (deck) {
          return Promise.resolve(Response.json({ ...detail, deck }));
        }

        return Promise.resolve(
          Response.json(url.includes("share-series") ? series : decks),
        );
      }),
    );
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens a deck's page from a card or a table name with the same window, and back returns to the overview without a request", async () => {
    history.replaceState(null, "", "/?window=7d");
    render(<App />);

    const [card] = await screen.findAllByRole("link", { name: "Monster Tron" });
    const requestsOnOverview = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(card);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Monster Tron",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe(
      "/decks/monster-tron-1bc68613?window=7d",
    );

    history.back();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Overview",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe("/?window=7d");
    expect(
      screen.getByRole("button", { name: "7d", pressed: true }),
    ).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.length).toBe(requestsOnOverview + 3);

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(location.pathname + location.search).toBe("/?window=7d&view=table");

    fireEvent.click(
      within(screen.getByRole("region", { name: "Deck table" })).getByRole(
        "link",
        { name: "Monster Tron" },
      ),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Monster Tron",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe(
      "/decks/monster-tron-1bc68613?window=7d",
    );
  });

  it("opens What to play? from the header with the same window", async () => {
    history.replaceState(null, "", "/matchups?window=14d");
    render(<App />);

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Pages" })).getByRole(
        "link",
        { name: "What to play?" },
      ),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "What to play?" }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe(
      "/what-to-play?window=14d",
    );
    expect(
      await screen.findByText(/^Based on the last 14 days\./),
    ).toBeTruthy();
  });

  it("serves Staples at its own address, with its title", async () => {
    history.replaceState(null, "", "/staples?window=30d&section=side");
    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Staples" }),
    ).toBeTruthy();
    expect(document.title).toBe("Staples · Pauper Endstep metagame");
    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Sideboard" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("opens Staples from the header with the same window", async () => {
    history.replaceState(null, "", "/matchups?window=14d");
    render(<App />);

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Pages" })).getByRole(
        "link",
        { name: "Staples" },
      ),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Staples" }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe("/staples?window=14d");
  });

  it("changes the text, the formats, the title and the lang attribute at once when the reader picks a language", async () => {
    history.replaceState(null, "", "/?window=30d");
    render(<App />);

    await screen.findByRole("heading", { level: 1, name: "Overview" });
    expect(await screen.findByText("236,728")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "it" },
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Panoramica" }),
    ).toBeTruthy();
    expect(screen.getByText("236.728")).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Finestra temporale" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["1g", "7g", "14g", "30g", "stagione"]);
    expect(document.documentElement.lang).toBe("it-IT");
    expect(document.title).toBe("Panoramica · Pauper Endstep metagame");
    expect(location.pathname + location.search).toBe("/?window=30d");
  });

  it("names the page on the screen in the canonical link and og:url, on the overview and on a deck page", async () => {
    history.replaceState(null, "", "/?window=7d");
    render(<App />);
    const address = (): (string | null)[] => [
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href ?? null,
      document.head
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content") ?? null,
    ];

    const [card] = await screen.findAllByRole("link", { name: "Monster Tron" });

    expect(address()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/",
      "https://pauper-endstep-metagame.vercel.app/",
    ]);

    fireEvent.click(card);
    await screen.findByRole("heading", { level: 1, name: "Monster Tron" });

    expect(address()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/decks/monster-tron-1bc68613",
      "https://pauper-endstep-metagame.vercel.app/decks/monster-tron-1bc68613",
    ]);

    history.back();
    await screen.findByRole("heading", { level: 1, name: "Overview" });

    expect(address()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/",
      "https://pauper-endstep-metagame.vercel.app/",
    ]);
  });

  it("names no page on the Not found page", async () => {
    history.replaceState(null, "", "/no-such-page?window=30d");
    render(<App />);

    await screen.findByRole("heading", { level: 1, name: "Not found" });

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  });

  it("names no page for a deck that does not exist", async () => {
    const answer = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input) =>
      String(input).includes("/decks/no-such-deck")
        ? Promise.resolve(
            Response.json({ error: "Not found" }, { status: 404 }),
          )
        : answer!(input),
    );
    history.replaceState(null, "", "/decks/no-such-deck?window=30d");
    render(<App />);

    await screen.findByRole("heading", {
      level: 1,
      name: "No deck at this address",
    });

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  });

  it("adds the script of Vercel Web Analytics, with no error", async () => {
    const error = vi.spyOn(console, "error");
    history.replaceState(null, "", "/?window=30d");
    render(<App />);

    await screen.findByRole("heading", { level: 1, name: "Overview" });

    expect(
      document.querySelectorAll('script[data-sdkn="@vercel/analytics/react"]'),
    ).toHaveLength(1);
    expect(error).not.toHaveBeenCalled();
  });
});
