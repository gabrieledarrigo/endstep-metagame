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

function firstMark(container: HTMLElement): Element {
  const mark = container.querySelector(".recharts-scatter-symbol");
  fireEvent.mouseEnter(mark as Element);

  return mark?.querySelector("circle") as Element;
}

function press(find: () => Element, pointerType = "touch"): void {
  fireEvent.pointerDown(find(), { pointerType });
  fireEvent.pointerUp(find(), { pointerType });
}

function tap(find: () => Element, pointerType = "touch"): void {
  press(find, pointerType);
  fireEvent.click(find());
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

  it("draws in the theme's colours, so a change of theme recolours it", () => {
    const { container } = renderScatter(DECKS);

    const mark = container.querySelector(".recharts-scatter-symbol circle");
    expect(mark?.getAttribute("fill")).toBe("var(--s1)");
    expect(mark?.getAttribute("stroke")).toBe("var(--surface)");
    expect(mark?.getAttribute("fill-opacity")).toBe("var(--mark-opacity)");
  });

  it("gives every marker's circle the class that its pointed and armed look style", () => {
    renderScatter(DECKS);

    for (const deck of DECKS) {
      expect(
        screen
          .getByRole("link", { name: deck.name })
          .querySelector("circle")
          ?.classList.contains("win-rate__dot"),
      ).toBe(true);
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

  it("keeps the label of the deck listed first when two decks tie, whatever their player counts", () => {
    const tied = {
      ...DECKS[1],
      id: "tied",
      name: "Tied",
      players: DECKS[0].players + 1,
      share: { ...DECKS[0].share },
      matchWinRate: { ...DECKS[0].matchWinRate },
    };

    renderScatter([DECKS[0], tied, DECKS[2]]);

    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.queryByText("Tied")).toBeNull();
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

  it("links each marker to its deck's page in the current window, named after the deck", () => {
    renderScatter(DECKS);

    for (const deck of DECKS) {
      expect(
        screen.getByRole("link", { name: deck.name }).getAttribute("href"),
      ).toBe(`/decks/${deck.slug}?window=7d`);
    }
  });

  it("draws the decks with fewer players last, so a large marker never hides a small one", () => {
    renderScatter([DECKS[2], DECKS[0], DECKS[1]]);

    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(DECKS.map((deck) => `/decks/${deck.slug}?window=7d`));
  });

  it("lets a click on the 50% label through to the markers under it", () => {
    renderScatter(DECKS);

    expect(
      screen
        .getByText("50% win rate")
        .closest("text")
        ?.getAttribute("pointer-events"),
    ).toBe("none");
  });

  it("opens the deck at once on a mouse click", () => {
    const { container } = renderScatter(DECKS);

    tap(() => firstMark(container), "mouse");

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("shows the tooltip on a first tap, and opens the deck on a second tap", () => {
    const { container } = renderScatter(DECKS);

    tap(() => firstMark(container));

    expect(screen.getByText("Tap again to open the deck.")).toBeTruthy();
    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();

    tap(() => firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("opens the deck on a second tap when the first tap sent no click, as iOS does when a tap shows a tooltip", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));

    expect(screen.getByText("Tap again to open the deck.")).toBeTruthy();

    tap(() => firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("opens the deck on a click with no pointer before it, even after a tap", () => {
    const { container } = renderScatter(DECKS);

    tap(() => firstMark(container));
    fireEvent.click(firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("follows a stray click on an armed marker that no tap sent", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    clock.mockReturnValue(now + 2000);
    fireEvent.click(firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("forgets the first tap after a tap outside the chart", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    tap(() => firstMark(container));

    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();
  });

  it("listens for a tap elsewhere only while a marker is armed", () => {
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    const pointerdowns = (spy: typeof added): number =>
      spy.mock.calls.filter(([type]) => type === "pointerdown").length;
    const { container, unmount } = renderScatter(DECKS);

    expect(pointerdowns(added)).toBe(0);

    press(() => firstMark(container));
    fireEvent.pointerDown(document.body);

    expect(pointerdowns(added)).toBe(1);
    expect(pointerdowns(removed)).toBe(1);

    press(() => firstMark(container));
    unmount();

    expect(pointerdowns(added)).toBe(2);
    expect(pointerdowns(removed)).toBe(2);
  });

  it("forgets the first tap after a tap off the markers", () => {
    const { container } = renderScatter(DECKS);

    tap(() => firstMark(container));
    tap(() => container.querySelector(".win-rate__frame") as Element);
    tap(() => firstMark(container));

    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();
  });

  it("forgets the first tap when the decks change", () => {
    const { container, rerender } = renderScatter(DECKS);

    tap(() => firstMark(container));
    rerender(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <WinRateScatter decks={[...DECKS]} />
        <Address />
      </MemoryRouter>,
    );
    tap(() => firstMark(container));

    expect(screen.queryByText(AFFINITY_PAGE)).toBeNull();
  });

  it("marks a marker armed by a first tap, and no other", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));

    expect(
      screen
        .getByRole("link", { name: "Affinity" })
        .querySelector(".win-rate__mark--armed"),
    ).not.toBeNull();
    expect(container.querySelectorAll(".win-rate__mark--armed")).toHaveLength(
      1,
    );
  });

  it("marks nothing on a mouse press", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container), "mouse");

    expect(container.querySelector(".win-rate__mark--armed")).toBeNull();
  });

  it("clears the armed mark after a tap elsewhere", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    fireEvent.pointerDown(document.body, { pointerType: "touch" });

    expect(container.querySelector(".win-rate__mark--armed")).toBeNull();
  });

  it("clears the armed mark once a mouse moves over the chart, so only one marker looks pointed", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    fireEvent.pointerMove(
      screen.getByRole("link", { name: "Mono Red Madness" }),
      { pointerType: "mouse" },
    );

    expect(container.querySelector(".win-rate__mark--armed")).toBeNull();
    expect(screen.queryByText("Tap again to open the deck.")).toBeNull();
  });

  it("follows a click with no tap before it once a mouse has disarmed the marker", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    fireEvent.pointerMove(
      screen.getByRole("link", { name: "Mono Red Madness" }),
      { pointerType: "mouse" },
    );
    fireEvent.click(firstMark(container));

    expect(screen.getByText(AFFINITY_PAGE)).toBeTruthy();
  });

  it("keeps the armed mark while a finger moves over the chart", () => {
    const { container } = renderScatter(DECKS);

    press(() => firstMark(container));
    fireEvent.pointerMove(firstMark(container), { pointerType: "touch" });

    expect(container.querySelector(".win-rate__mark--armed")).not.toBeNull();
  });

  it("clears the armed mark when the decks change", () => {
    const { container, rerender } = renderScatter(DECKS);

    press(() => firstMark(container));
    rerender(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <WinRateScatter decks={[...DECKS]} />
        <Address />
      </MemoryRouter>,
    );

    expect(container.querySelector(".win-rate__mark--armed")).toBeNull();
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
