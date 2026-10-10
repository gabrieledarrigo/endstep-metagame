import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import type { Deck } from "../../api/types";
import { DeckGrid, DeckGridSkeleton } from "./DeckGrid";

describe("DeckGrid", () => {
  it("shows a card for each deck, in order, under a heading", () => {
    render(
      <MemoryRouter>
        <DeckGrid decks={decks.decks.items as Deck[]} />
      </MemoryRouter>,
    );

    const grid = screen.getByRole("region", { name: "Decks by meta share" });
    expect(
      within(grid)
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(["Affinity", "Mono Red Madness", "Monster Tron"]);
  });
});

describe("DeckGridSkeleton", () => {
  it("marks the grid as busy and holds a placeholder card for each of the 24 decks", () => {
    const { container } = render(<DeckGridSkeleton />);

    const grid = container.firstElementChild;
    expect(grid?.getAttribute("aria-busy")).toBe("true");
    expect(grid?.children).toHaveLength(24);
  });
});
