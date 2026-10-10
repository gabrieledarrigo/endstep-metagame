import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import type { Deck } from "../../api/types";
import { DeckTable, DeckTableSkeleton } from "./DeckTable";

function Address() {
  const { search } = useLocation();

  return (
    <p>
      Address: {search} by {useNavigationType()}
    </p>
  );
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DeckTable decks={decks.decks.items as Deck[]} />
      <Address />
    </MemoryRouter>,
  );
}

function deckOrder(): (string | null)[] {
  return screen.getAllByRole("rowheader").map((cell) => cell.textContent);
}

describe("DeckTable", () => {
  it("sorts by share, descending, when the address names no sort", () => {
    renderAt("/?window=30d");

    expect(deckOrder()).toEqual([
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
    ]);
    expect(
      screen
        .getByRole("columnheader", { name: "Share" })
        .getAttribute("aria-sort"),
    ).toBe("descending");
  });

  it("reads the sort from the address", () => {
    renderAt("/?window=30d&sort=players&dir=asc");

    expect(deckOrder()).toEqual([
      "Monster Tron",
      "Mono Red Madness",
      "Affinity",
    ]);
    expect(
      screen
        .getByRole("columnheader", { name: "Players" })
        .getAttribute("aria-sort"),
    ).toBe("ascending");
  });

  it("writes a new sort into the address, replacing the history entry", () => {
    renderAt("/?window=30d");

    fireEvent.click(screen.getByRole("button", { name: "Deck" }));

    expect(
      screen.getByText("Address: ?window=30d&sort=name&dir=asc by REPLACE"),
    ).toBeTruthy();
    expect(deckOrder()).toEqual([
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Deck" }));

    expect(
      screen.getByText("Address: ?window=30d&sort=name&dir=desc by REPLACE"),
    ).toBeTruthy();
    expect(deckOrder()).toEqual([
      "Monster Tron",
      "Mono Red Madness",
      "Affinity",
    ]);
  });

  it("leaves the parameters out for the default sort", () => {
    renderAt("/?window=30d&sort=share&dir=asc");

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
  });

  it("draws nothing without decks", () => {
    const { container } = render(
      <MemoryRouter>
        <DeckTable decks={[]} />
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("reads a match win rate from fewer than 20 decided matches as too few to call", () => {
    const [first, ...rest] = decks.decks.items as Deck[];
    render(
      <MemoryRouter>
        <DeckTable
          decks={[
            {
              ...first,
              matchWinRate: { ...first.matchWinRate, wins: 9, losses: 3 },
            },
            ...rest,
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Too few to call")).toBeTruthy();
  });
});

describe("DeckTableSkeleton", () => {
  it("keeps the column headers, holds a row for each of the 24 decks, and is marked as busy", () => {
    const { container } = render(<DeckTableSkeleton />);

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "",
      "Deck",
      "Colours",
      "Share",
      "Players",
      "Matches",
      "Match win rate",
      "Change",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(25);
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
