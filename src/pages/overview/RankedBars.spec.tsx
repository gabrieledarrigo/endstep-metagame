import { fireEvent, render, screen } from "@testing-library/react";
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

  it("leaves the rest of the field out when the decks cover all of it", () => {
    renderBars(page([0.6, 0.4]));

    expect(screen.getByText("60.00%")).toBeTruthy();
    expect(screen.getByText("40.00%")).toBeTruthy();
    expect(screen.queryByText("Other")).toBeNull();
  });

  it("links every deck's row to its page in the current window, and not the rest of the field", () => {
    renderBars(PAGE);

    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(PAGE.items.map((deck) => `/decks/${deck.slug}?window=7d`));
  });

  it("lets a click on a value label through to its row", () => {
    renderBars(PAGE);

    expect(
      screen.getByText("9.56%").closest("text")?.getAttribute("pointer-events"),
    ).toBe("none");
  });

  it("opens a deck's page from anywhere on its row", () => {
    renderBars(PAGE);
    const row = screen.getAllByRole("link")[1].querySelector("rect");

    fireEvent.click(row as Element);

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
