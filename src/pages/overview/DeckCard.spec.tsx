import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import type { Deck } from "../../api/types";
import { DeckCard, DeckCardSkeleton } from "./DeckCard";

const AFFINITY = decks.decks.items[0] as Deck;

describe("DeckCard", () => {
  it("links to the deck page in the current window", () => {
    render(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <DeckCard deck={AFFINITY} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Affinity" }).getAttribute("href"),
    ).toBe("/decks/affinity-e93f5f74?window=7d");
  });

  it("shows the art, the name, the colours, the stats and the key cards", () => {
    render(
      <MemoryRouter>
        <DeckCard deck={AFFINITY} />
      </MemoryRouter>,
    );

    const card = screen.getByRole("link", { name: "Affinity" });
    const art = within(card).getByRole("img", { name: "Reckoner's Bargain" });
    expect(art.getAttribute("src")).toBe(
      "https://endstep.cc/api/cards/image?name=Reckoner%27s+Bargain&version=art_crop",
    );
    expect(
      within(card).getByRole("heading", { name: "Affinity" }),
    ).toBeTruthy();
    expect(within(card).getByText("Colours: white, blue, black")).toBeTruthy();
    expect(
      within(card)
        .getAllByRole("term")
        .map((term) => [
          term.textContent,
          term.nextElementSibling?.textContent,
        ]),
    ).toEqual([
      ["Share", "9.56%"],
      ["Players", "1,954"],
      ["Match win rate", "52.2%"],
      ["Share change", "\u25b2 3.79 pts"],
    ]);
    expect(
      within(card).getByText(
        "Reckoner's Bargain · Myr Enforcer · Utrom Monitor",
      ),
    ).toBeTruthy();
  });
});

describe("DeckCardSkeleton", () => {
  it("holds a placeholder for the art, the name, the colours, each stat and the key cards, and no link", () => {
    const { container } = render(<DeckCardSkeleton />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(12);
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("link")).toBeNull();
  });
});
