import {
  type RenderResult,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import { sizeCharts } from "../../../test/sizeCharts";
import type { Deck } from "../../api/types";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

const DECKS = decks.decks.items as Deck[];

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {pathname + search}</p>;
}

function renderScatter(decks: Deck[]): RenderResult {
  return render(
    <MemoryRouter initialEntries={["/?window=7d"]}>
      <WinRateScatter decks={decks} />
      <Address />
    </MemoryRouter>,
  );
}

function firstMark(container: HTMLElement): HTMLElement {
  const mark = container.querySelector(".recharts-scatter-symbol");
  fireEvent.mouseEnter(mark as Element);

  return mark?.querySelector("a") as HTMLElement;
}

function tap(element: Element, pointerType = "touch"): void {
  fireEvent.pointerDown(element, { pointerType });
  fireEvent.click(element);
}

const AFFINITY_PAGE = `Address: /decks/${DECKS[0].slug}?window=7d`;

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WinRateScatter", () => {
  it("draws the axes, the 50% line and a label for each deck that has room", () => {
    renderScatter(DECKS);

    expect(
      screen.getByRole("heading", { name: "Win rate against share" }),
    ).toBeTruthy();
    for (const text of [
      "meta share",
      "match win rate",
      "50% win rate",
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it("drops the label of a deck that would overlap a label already placed", () => {
    const crowded = {
      ...DECKS[1],
      id: "crowded",
      name: "Crowded",
      share: { ...DECKS[0].share, rate: DECKS[0].share.rate - 0.001 },
      matchWinRate: { ...DECKS[0].matchWinRate },
    };

    renderScatter([DECKS[0], crowded, DECKS[2]]);

    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.queryByText("Crowded")).toBeNull();
  });

  it("shows a deck's numbers in the tooltip", () => {
    const { container } = renderScatter(DECKS);

    fireEvent.mouseEnter(
      container.querySelectorAll(".recharts-scatter-symbol")[0],
    );

    expect(screen.getByText("Confidence bounds")).toBeTruthy();
    expect(screen.getByText("51.4% to 53.1%")).toBeTruthy();
    expect(screen.getByText("Click to open the deck.")).toBeTruthy();
  });

  it("links each marker to its deck's page in the current window", () => {
    renderScatter(DECKS);

    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(DECKS.map((deck) => `/decks/${deck.slug}?window=7d`));
  });

  it("opens the deck at once on a mouse click", () => {
    const { container } = renderScatter(DECKS);

    tap(firstMark(container), "mouse");

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("shows the tooltip on a first tap, and opens the deck on a second tap", () => {
    const { container } = renderScatter(DECKS);

    tap(firstMark(container));

    expect(screen.getByText("Tap again to open the deck.")).toBeTruthy();
    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();

    tap(firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("forgets the first tap after a tap off the markers", () => {
    const { container } = renderScatter(DECKS);

    tap(firstMark(container));
    tap(container.querySelector(".win-rate__frame") as Element);
    tap(firstMark(container));

    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();
  });

  it("forgets the first tap when the decks change", () => {
    const { container, rerender } = renderScatter(DECKS);

    tap(firstMark(container));
    rerender(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <WinRateScatter decks={[...DECKS]} />
        <Address />
      </MemoryRouter>,
    );
    tap(firstMark(container));

    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();
  });

  it("leaves out a deck with fewer than 20 decided matches", () => {
    const gated = {
      ...DECKS[2],
      matchWinRate: { ...DECKS[2].matchWinRate, wins: 9, losses: 3 },
    };

    renderScatter([DECKS[0], DECKS[1], gated]);

    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.queryByText("Monster Tron")).toBeNull();
    expect(
      screen.getByText(
        /1 deck with fewer than 20 decided matches is left out, too few to place\.$/,
      ),
    ).toBeTruthy();
  });

  it("keeps the section and says why when every deck is too few to place", () => {
    const gated = DECKS.map((deck) => ({
      ...deck,
      matchWinRate: { ...deck.matchWinRate, wins: 9, losses: 3 },
    }));

    renderScatter(gated);

    expect(
      screen.getByRole("heading", { name: "Win rate against share" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "3 decks with fewer than 20 decided matches are left out, too few to place.",
      ),
    ).toBeTruthy();
  });

  it("draws nothing without decks", () => {
    const { container } = render(<WinRateScatter decks={[]} />);

    expect(container.innerHTML).toBe("");
  });
});

describe("WinRateScatterSkeleton", () => {
  it("keeps the heading and the note, and marks the panel as busy", () => {
    const { container } = render(<WinRateScatterSkeleton />);

    expect(
      screen.getByRole("heading", { name: "Win rate against share" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/^The bubble area represents player count\./),
    ).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
