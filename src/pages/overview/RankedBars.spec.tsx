import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import { sizeCharts } from "../../../test/sizeCharts";
import type { Deck, Page } from "../../api/types";
import { RankedBars, RankedBarsSkeleton } from "./RankedBars";

const PAGE = decks.decks as Page<Deck>;

function page(shares: number[]): Page<Deck> {
  return {
    ...PAGE,
    total: shares.length,
    items: shares.map((rate, index) => ({
      ...PAGE.items[index],
      share: { ...PAGE.items[index].share, rate },
    })),
  };
}

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {pathname + search}</p>;
}

function renderBars(decks: Page<Deck>): void {
  render(
    <MemoryRouter initialEntries={["/?window=7d"]}>
      <RankedBars decks={decks} />
      <Address />
    </MemoryRouter>,
  );
}

function barFills(): (string | null)[] {
  return [...document.querySelectorAll(".recharts-bar-rectangle path")].map(
    (bar) => bar.getAttribute("fill"),
  );
}

const RESTING = [
  "var(--seq-500)",
  "var(--seq-500)",
  "var(--seq-500)",
  "var(--text-400)",
];

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RankedBars", () => {
  it("draws a labelled bar for each deck and one for the rest of the field", () => {
    renderBars(PAGE);

    expect(
      screen.getByRole("heading", { name: "Meta share by deck" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Meta share by deck, chart" })
        .getAttribute("tabindex"),
    ).toBe("0");
    for (const label of ["9.56%", "6.81%", "4.70%", "78.93%"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("Other")).toBeTruthy();
    expect(screen.getByText("(249")).toBeTruthy();
  });

  it("draws in the theme's colours, so a change of theme recolours it", () => {
    renderBars(PAGE);

    expect(barFills()).toEqual(RESTING);
  });

  it("underlines a pointed deck's name in --text-900 and fills its bar with --seq-600, until the pointer leaves", () => {
    renderBars(PAGE);
    const link = screen.getByRole("link", { name: "Affinity" });
    const row = link.querySelector("rect") as Element;
    const name = within(link).getByText("Affinity").closest("text") as Element;

    fireEvent.pointerMove(row, { pointerType: "mouse" });

    expect(barFills()).toEqual([
      "var(--seq-600)",
      "var(--seq-500)",
      "var(--seq-500)",
      "var(--text-400)",
    ]);
    expect(name.getAttribute("fill")).toBe("var(--text-900)");
    expect(name.getAttribute("text-decoration")).toBe("underline");

    fireEvent.pointerLeave(row, { pointerType: "mouse" });

    expect(barFills()).toEqual(RESTING);
    expect(name.getAttribute("fill")).toBe("var(--text-600)");
    expect(name.getAttribute("text-decoration")).toBeNull();
  });

  it("points at a row again when the pointer slips off and back before the chart redraws", () => {
    renderBars(PAGE);
    const row = screen
      .getByRole("link", { name: PAGE.items[1].name })
      .querySelector("rect") as Element;

    fireEvent.pointerMove(row, { pointerType: "mouse" });
    act(() => {
      fireEvent.pointerLeave(row, { pointerType: "mouse" });
      fireEvent.pointerMove(row, { pointerType: "mouse" });
    });

    expect(barFills()[1]).toBe("var(--seq-600)");
  });

  it("leaves the rest of the field as it is under the pointer, since it is not a deck", () => {
    renderBars(PAGE);
    const other = screen.getByText("Other");

    fireEvent.pointerMove(other, { pointerType: "mouse" });

    expect(barFills()).toEqual(RESTING);
    expect(other.closest("text")?.getAttribute("fill")).toBe("var(--text-600)");
    expect(other.closest("text")?.getAttribute("text-decoration")).toBeNull();
  });

  it("leaves a row as it is under a finger, which opens the deck at once", () => {
    renderBars(PAGE);
    const link = screen.getByRole("link", { name: "Affinity" });

    fireEvent.pointerMove(link.querySelector("rect") as Element, {
      pointerType: "touch",
    });

    expect(barFills()).toEqual(RESTING);
    expect(
      within(link)
        .getByText("Affinity")
        .closest("text")
        ?.getAttribute("text-decoration"),
    ).toBeNull();
  });

  it("forgets the pointed deck when the decks change, and points again once the pointer moves", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <RankedBars decks={PAGE} />
      </MemoryRouter>,
    );
    const row = (): Element =>
      screen
        .getByRole("link", { name: PAGE.items[1].name })
        .querySelector("rect") as Element;

    fireEvent.pointerMove(row(), { pointerType: "mouse" });
    rerender(
      <MemoryRouter initialEntries={["/?window=7d"]}>
        <RankedBars decks={{ ...PAGE }} />
      </MemoryRouter>,
    );

    expect(barFills()).toEqual(RESTING);

    fireEvent.pointerMove(row(), { pointerType: "mouse" });

    expect(barFills()[1]).toBe("var(--seq-600)");
  });

  it("leaves the rest of the field out when the decks cover all of it", () => {
    renderBars(page([0.6, 0.4]));

    expect(screen.getByText("60.00%")).toBeTruthy();
    expect(screen.getByText("40.00%")).toBeTruthy();
    expect(screen.queryByText("Other")).toBeNull();
  });

  it("links every deck's row to its page in the current window, and not the rest of the field", () => {
    renderBars(PAGE);

    expect(
      screen
        .getAllByRole("link")
        .map((link) => [
          link.getAttribute("aria-label"),
          link.getAttribute("href"),
        ]),
    ).toEqual(
      PAGE.items.map((deck) => [deck.name, `/decks/${deck.slug}?window=7d`]),
    );
  });

  it("lets a click on a value label through to its row", () => {
    renderBars(PAGE);

    expect(
      screen.getByText("9.56%").closest("text")?.getAttribute("pointer-events"),
    ).toBe("none");
  });

  it("opens a deck's page from anywhere on its row, drawn over the bar", () => {
    renderBars(PAGE);
    const link = screen.getAllByRole("link")[1];
    const bar = document.querySelectorAll(".recharts-bar-rectangle")[1];

    expect(
      bar.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(link.querySelector("rect") as Element);

    expect(
      screen.getByText(`Address: /decks/${PAGE.items[1].slug}?window=7d`),
    ).toBeTruthy();
  });

  it("draws nothing without decks", () => {
    const { container } = render(<RankedBars decks={page([])} />);

    expect(container.innerHTML).toBe("");
  });
});

describe("RankedBarsSkeleton", () => {
  it("keeps the heading and the note, and marks the section as busy", () => {
    const { container } = render(<RankedBarsSkeleton />);

    expect(
      screen.getByRole("heading", { name: "Meta share by deck" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Other covers every archetype outside the top 24\./),
    ).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
