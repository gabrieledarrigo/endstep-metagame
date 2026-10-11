import { screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import matrix from "../../../test/fixtures/matchups.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import type { Deck, DeckDetail } from "../../api/types";
import { DeckMatchups } from "./DeckMatchups";

const DECK: Deck = (detail as DeckDetail).deck;
const MATRIX_WINDOW = matrix.window;

function renderRow(
  deck: Deck,
  answer: () => Response | Promise<Response> = () => Response.json(matrix),
  detailWindow = MATRIX_WINDOW,
  detailLoading = false,
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async () => answer());
  vi.stubGlobal("fetch", fetchMock);

  renderWithQueries(
    <MemoryRouter initialEntries={[`/decks/${deck.slug}?window=30d`]}>
      <DeckMatchups
        deck={deck}
        detailWindow={detailWindow}
        detailLoading={detailLoading}
        timeWindow="30d"
      />
    </MemoryRouter>,
  );

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeckMatchups", () => {
  it("shows the deck's row against the other decks of the top, in share order, with a legend and no mirror", async () => {
    const fetchMock = renderRow(DECK);

    const grid = await screen.findByRole("grid", {
      name: "Match win rate of Affinity against the other 3 decks in the top 4, 30d window, rated.",
    });
    expect(
      screen.getByRole("region", { name: "Matchups against the top 4" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Match win rate against each of the other 3 decks in the top 4, in share order. Read across.",
      ),
    ).toBeTruthy();
    expect(
      within(grid)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Deck", "Mono Red Madness", "Monster Tron", "Naya Gates"]);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(3);
    expect(
      within(screen.getByRole("list", { name: "Legend" })).queryByText(
        "Mirror",
      ),
    ).toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/matchups?window=30d");
  });

  it("finds the row by the deck's id, whatever slug the address used", async () => {
    renderRow({ ...DECK, slug: "renamed-e93f5f74" });

    expect(
      await screen.findByRole("gridcell", {
        name: "Affinity against Mono Red Madness: 57%, clear result",
      }),
    ).toBeTruthy();
  });

  it("says so and links to the matchup table when the deck is outside the top", async () => {
    renderRow({ ...DECK, id: "elsewhere" });

    expect(
      await screen.findByText(
        /^Affinity is not in the top 4 for this window, so it has no row in the matchup table\./,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "See the matchup table" })
        .getAttribute("href"),
    ).toBe("/matchups?window=30d");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("prints the row's own dates when they differ from the deck's", async () => {
    renderRow(DECK, undefined, { from: "2026-09-10", to: "2026-10-10" });

    expect(
      await screen.findByText("These matchups cover 11 Sep to 10 Oct 2026."),
    ).toBeTruthy();
  });

  it("prints no dates of its own while the deck's own window is still loading", async () => {
    renderRow(DECK, undefined, { from: "2026-09-10", to: "2026-10-10" }, true);

    await screen.findByRole("grid");
    expect(screen.queryByText(/^These matchups cover/)).toBeNull();
  });

  it("says there are no matchups when the window has none yet", async () => {
    renderRow(DECK, () => Response.json({ ...matrix, decks: [], cells: {} }));

    expect(
      await screen.findByText("No matchups are recorded for this window yet."),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Matchups against the top 24" }),
    ).toBeTruthy();
  });

  it("prints no dates of its own when they match the deck's", async () => {
    renderRow(DECK);

    await screen.findByRole("grid");
    expect(screen.queryByText(/^These matchups cover/)).toBeNull();
  });

  it("fails inside its own section, with a retry and no automatic one", async () => {
    const fetchMock = renderRow(DECK, () =>
      Response.json({ error: "x" }, { status: 502 }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "The matchups could not be loaded",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
