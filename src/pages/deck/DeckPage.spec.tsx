import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { DeckPage } from "./DeckPage";

function renderWith(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);

  renderWithQueries(
    <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=7d"]}>
      <Routes>
        <Route path="/decks/:slug" element={<DeckPage />} />
      </Routes>
    </MemoryRouter>,
  );

  return fetchMock;
}

describe("DeckPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("titles the page with the name of the deck in the address, for its window", async () => {
    const fetchMock = renderWith(Response.json({ deck: { name: "Affinity" } }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Loading the deck" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Affinity" }),
    ).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/decks/affinity-e93f5f74?window=7d&population=rated",
    );
  });

  it("offers a retry when the deck cannot be loaded", async () => {
    renderWith(Response.json({ error: "Unknown deck" }, { status: 404 }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "The deck could not be loaded",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Deck" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
