import { render, screen } from "@testing-library/react";
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

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RankedBars", () => {
  it("draws a labelled bar for each deck and one for the rest of the field", () => {
    render(<RankedBars decks={PAGE} />);

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
    render(<RankedBars decks={page([0.6, 0.4])} />);

    expect(screen.getByText("60.00%")).toBeTruthy();
    expect(screen.getByText("40.00%")).toBeTruthy();
    expect(screen.queryByText("Other")).toBeNull();
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
    expect(screen.getByText(/^Other is a residual, not a deck\./)).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
