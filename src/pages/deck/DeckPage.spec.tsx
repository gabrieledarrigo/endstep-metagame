import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { DeckPage } from "./DeckPage";

describe("DeckPage", () => {
  it("names the deck from the address", () => {
    render(
      <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=7d"]}>
        <Routes>
          <Route path="/decks/:slug" element={<DeckPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Deck Endstep Pauper metagame",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("The page for affinity-e93f5f74 is not built yet."),
    ).toBeTruthy();
  });
});
