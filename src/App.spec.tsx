import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import decks from "../test/fixtures/decks.json";
import series from "../test/fixtures/share-series.json";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          Response.json(
            String(input).includes("share-series") ? series : decks,
          ),
        ),
      ),
    );
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens a deck's page from a card or a table name with the same window, and back returns to the overview", async () => {
    history.replaceState(null, "", "/?window=7d");
    render(<App />);

    const [card] = await screen.findAllByRole("link", { name: "Monster Tron" });
    fireEvent.click(card);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Deck Endstep Pauper metagame",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe(
      "/decks/monster-tron-1bc68613?window=7d",
    );

    history.back();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Overview Endstep Pauper metagame",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe("/?window=7d");
    expect(
      screen.getByRole("button", { name: "7d", pressed: true }),
    ).toBeTruthy();

    const [, tableName] = await screen.findAllByRole("link", {
      name: "Monster Tron",
    });
    fireEvent.click(tableName);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Deck Endstep Pauper metagame",
      }),
    ).toBeTruthy();
    expect(location.pathname + location.search).toBe(
      "/decks/monster-tron-1bc68613?window=7d",
    );
  });
});
