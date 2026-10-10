import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../test/fixtures/deck.json";
import decks from "../test/fixtures/decks.json";
import series from "../test/fixtures/share-series.json";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
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
    expect(vi.mocked(fetch).mock.calls.length).toBe(requestsOnOverview + 1);

    const [, tableName] = screen.getAllByRole("link", {
      name: "Monster Tron",
    });
    fireEvent.click(tableName);

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
});
