import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("names itself with a heading, as the deck grid does", () => {
    renderAt("/?window=30d");

    const region = screen.getByRole("region", { name: "Deck table" });
    const heading = within(region).getByRole("heading", {
      level: 2,
      name: "Deck table",
    });
    expect(region.getAttribute("aria-labelledby")).toBe(heading.id);
  });

  it("names the top decks in its caption, or the caption it is given", () => {
    const { rerender } = render(
      <MemoryRouter>
        <DeckTable decks={decks.decks.items as Deck[]} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("table", {
        name: "The top 3 decks, sortable by column",
      }),
    ).toBeTruthy();

    rerender(
      <MemoryRouter>
        <DeckTable
          decks={decks.decks.items as Deck[]}
          caption="Decks that match altar, sortable by column"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("table", {
        name: "Decks that match altar, sortable by column",
      }),
    ).toBeTruthy();
  });

  it("writes a share above zero that one decimal would round to zero as under 0.1%", () => {
    const [first, ...rest] = decks.decks.items as Deck[];
    render(
      <MemoryRouter>
        <DeckTable
          decks={[
            ...rest,
            { ...first, share: { ...first.share, rate: 0.0000191 } },
          ]}
        />
      </MemoryRouter>,
    );

    expect(
      within(screen.getByRole("row", { name: /Affinity/ })).getByText("<0.1%"),
    ).toBeTruthy();
  });

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

    expect(screen.getByText("Too few to call, 12 of 20")).toBeTruthy();
  });

  it.each([
    ["desc", 1],
    ["asc", 0],
  ] as const)(
    "sorts a match win rate that is too few to call after every real one, %s",
    (dir, rate) => {
      const [first, ...rest] = decks.decks.items as Deck[];
      render(
        <MemoryRouter initialEntries={[`/?sort=winRate&dir=${dir}`]}>
          <DeckTable
            decks={[
              ...rest,
              {
                ...first,
                matchWinRate: {
                  ...first.matchWinRate,
                  wins: 3,
                  losses: 0,
                  rate,
                },
              },
            ]}
          />
        </MemoryRouter>,
      );

      expect(deckOrder().at(-1)).toBe("Affinity");
    },
  );
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
