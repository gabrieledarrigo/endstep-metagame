import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import type { DeckDetail, TimeWindow } from "../../api/types";
import { DeckHero } from "./DeckHero";

const DECK = (detail as DeckDetail).deck;

function renderHero(onSelect: (next: TimeWindow) => void = () => {}): void {
  render(
    <MemoryRouter>
      <DeckHero
        deck={DECK}
        dates="11 Sep to 10 Oct 2026"
        timeWindow="30d"
        onSelect={onSelect}
      />
    </MemoryRouter>,
  );
}

describe("DeckHero", () => {
  it("names the deck in the page's main heading, with its art, colours and key cards", () => {
    renderHero();

    expect(
      screen.getByRole("heading", { level: 1, name: "Affinity" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("img", { name: "Reckoner's Bargain" })
        .getAttribute("src"),
    ).toBe(
      "https://endstep.cc/api/cards/image?name=Reckoner%27s+Bargain&version=art_crop",
    );
    expect(screen.getByText("Colours: white, blue, black")).toBeTruthy();
    expect(
      screen.getByText("Reckoner's Bargain · Myr Enforcer · Utrom Monitor"),
    ).toBeTruthy();
  });

  it("has the window selector and the window's dates", () => {
    const onSelect = vi.fn<(next: TimeWindow) => void>();
    renderHero(onSelect);

    expect(screen.getByText("11 Sep to 10 Oct 2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(onSelect).toHaveBeenCalledWith("7d");
  });

  it("links to the same deck on endstep.cc, in a new tab", () => {
    renderHero();

    const link = screen.getByRole("link", {
      name: "View on endstep.cc, opens in a new tab",
    });
    expect(link.getAttribute("href")).toBe(
      "https://endstep.cc/metagame/Pauper/affinity-e93f5f74",
    );
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
