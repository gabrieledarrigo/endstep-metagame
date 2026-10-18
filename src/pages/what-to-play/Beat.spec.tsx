import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatchupCell, MatchupMatrix } from "../../api/types";
import { type RankedDeck, rankDecks } from "../../helpers";
import { Beat, BeatSkeleton } from "./Beat";

const MATRIX = matrix as MatchupMatrix;

function rankingOf(m: MatchupMatrix): RankedDeck[] {
  return rankDecks(
    m,
    Object.fromEntries(m.decks.map((deck) => [deck.slug, deck.share])),
  );
}

function Address() {
  const { search } = useLocation();
  const navigationType = useNavigationType();

  return (
    <p>
      Address: {search}, {navigationType}
    </p>
  );
}

function renderAt(path: string, ui: ReactElement): HTMLElement {
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Address />
    </MemoryRouter>,
  );

  return container;
}

function picker(): HTMLSelectElement {
  return screen.getByRole("combobox", { name: "Deck" });
}

function chosen(): string {
  return picker().selectedOptions[0].textContent ?? "";
}

function rows(): string[][] {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .map((row) =>
      [
        ...within(row).queryAllByRole("columnheader"),
        ...within(row).queryAllByRole("cell"),
      ].map((cell) => cell.textContent ?? ""),
    );
}

function ranged(rate: number, low: number, high: number): MatchupCell {
  return { wins: 60, losses: 40, matches: 100, gate: null, rate, low, high };
}

describe("Beat", () => {
  it("opens on the top deck by share, and says when nothing clearly beats it, with no table", () => {
    renderAt(
      "/what-to-play?window=30d",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Beat a deck" }),
    ).toBeTruthy();
    expect(chosen()).toBe("Affinity");
    expect(
      within(picker())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Affinity", "Mono Red Madness", "Monster Tron", "Naya Gates"]);
    expect(
      screen.getByText(
        "No deck in the top 4 clearly beats Affinity in this window.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Address: ?window=30d, POP")).toBeTruthy();
  });

  it("lists the deck that clearly beats the chosen one, with its rate and range against it and its rate against the metagame", () => {
    renderAt(
      "/what-to-play?window=30d&beat=mono-red-madness-60596e8a",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );

    expect(chosen()).toBe("Mono Red Madness");
    expect(
      screen.getByText("This deck clearly beats Mono Red Madness."),
    ).toBeTruthy();
    expect(rows()).toEqual([
      ["Deck", "Against Mono Red Madness", "Range", "Against the metagame"],
      ["Affinity", "57.1%, likely between 53.8% and 60.3%", "", "51.7%"],
    ]);
    expect(
      screen.getByRole("link", { name: "Affinity" }).getAttribute("href"),
    ).toBe("/decks/affinity-e93f5f74?window=30d");
  });

  it("draws each range on its own scale, from 50% to the highest bound rounded out to 5 points", () => {
    const container = renderAt(
      "/what-to-play?window=30d&beat=mono-red-madness-60596e8a",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );
    const style = (selector: string): CSSStyleDeclaration =>
      (container.querySelector(selector) as HTMLElement).style;

    expect(style(".range-bar__mid").left).toBe("0%");
    expect(style(".range-bar__span").left).toBe("25.6%");
    expect(style(".range-bar__span").width).toBe("42.73%");
    expect(
      container
        .querySelector(".range-bar__span")
        ?.classList.contains("range-bar__span--win"),
    ).toBe(true);
  });

  it("lists several decks by their rate against the chosen one, highest first", () => {
    const decks = ["elves", "spy", "tron", "storm"].map((slug, index) => ({
      id: slug,
      slug: `${slug}-0000000${index}`,
      name: slug[0].toUpperCase() + slug.slice(1),
      colours: [],
      share: 0.1 - index * 0.01,
    }));
    const [elves, spy, tron, storm] = decks.map((deck) => deck.slug);
    const several: MatchupMatrix = {
      window: { from: "2026-09-19", to: "2026-10-19" },
      decks,
      cells: {
        [elves]: { [storm]: ranged(0.4, 0.33, 0.47) },
        [spy]: { [storm]: ranged(0.6, 0.53, 0.67) },
        [tron]: { [storm]: ranged(0.7, 0.62, 0.78) },
        [storm]: {
          [elves]: ranged(0.6, 0.53, 0.67),
          [spy]: ranged(0.4, 0.33, 0.47),
          [tron]: ranged(0.3, 0.22, 0.38),
        },
      },
    };

    renderAt(
      `/what-to-play?window=30d&beat=${storm}`,
      <Beat matrix={several} ranking={rankingOf(several)} />,
    );

    expect(screen.getByText("These decks clearly beat Storm.")).toBeTruthy();
    expect(rows().map((row) => row[0])).toEqual(["Deck", "Tron", "Spy"]);
  });

  it("finds a deck under an old name by its slug's suffix, and leaves the address as it is", () => {
    renderAt(
      "/what-to-play?window=30d&beat=renamed-60596e8a",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );

    expect(chosen()).toBe("Mono Red Madness");
    expect(
      screen.getByText("Address: ?window=30d&beat=renamed-60596e8a, POP"),
    ).toBeTruthy();
  });

  it("falls back to the top deck when the address names no deck of the top 24, and leaves the address as it is", () => {
    renderAt(
      "/what-to-play?window=30d&beat=stompy-12345678",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );

    expect(chosen()).toBe("Affinity");
    expect(
      screen.getByText(
        "No deck in the top 4 clearly beats Affinity in this window.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Address: ?window=30d&beat=stompy-12345678, POP"),
    ).toBeTruthy();
  });

  it("writes a chosen deck in place of the history entry, the top deck included", () => {
    renderAt(
      "/what-to-play?window=30d&beat=stompy-12345678",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} />,
    );

    fireEvent.change(picker(), {
      target: { value: "mono-red-madness-60596e8a" },
    });

    expect(
      screen.getByText(
        "Address: ?window=30d&beat=mono-red-madness-60596e8a, REPLACE",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("This deck clearly beats Mono Red Madness."),
    ).toBeTruthy();

    fireEvent.change(picker(), { target: { value: "affinity-e93f5f74" } });

    expect(
      screen.getByText("Address: ?window=30d&beat=affinity-e93f5f74, REPLACE"),
    ).toBeTruthy();
    expect(chosen()).toBe("Affinity");
  });

  it("holds back the sentence for a deck nothing beats while another window loads", () => {
    renderAt(
      "/what-to-play?window=7d",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} loadingWindow />,
    );

    expect(chosen()).toBe("Affinity");
    expect(screen.queryByText(/clearly beats/)).toBeNull();
  });

  it("keeps the table on screen while another window loads", () => {
    renderAt(
      "/what-to-play?window=7d&beat=mono-red-madness-60596e8a",
      <Beat matrix={MATRIX} ranking={rankingOf(MATRIX)} loadingWindow />,
    );

    expect(
      screen.getByText("This deck clearly beats Mono Red Madness."),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });
});

describe("BeatSkeleton", () => {
  it("keeps the panel's title and marks the panel busy", () => {
    render(<BeatSkeleton />);

    expect(
      screen
        .getByRole("heading", { level: 2, name: "Beat a deck" })
        .closest('[aria-busy="true"]'),
    ).toBeTruthy();
  });
});
