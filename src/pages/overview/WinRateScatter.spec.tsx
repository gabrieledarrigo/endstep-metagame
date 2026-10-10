import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import { sizeCharts } from "../../../test/sizeCharts";
import type { Deck } from "../../api/types";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

const DECKS = decks.decks.items as Deck[];

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WinRateScatter", () => {
  it("draws the axes, the 50% line and a label for each deck that has room", () => {
    render(<WinRateScatter decks={DECKS} />);

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

    render(<WinRateScatter decks={[DECKS[0], crowded, DECKS[2]]} />);

    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.queryByText("Crowded")).toBeNull();
  });

  it("shows a deck's numbers in the tooltip", () => {
    const { container } = render(<WinRateScatter decks={DECKS} />);

    fireEvent.mouseEnter(
      container.querySelectorAll(".recharts-scatter-symbol")[0],
    );

    expect(screen.getByText("Confidence bounds")).toBeTruthy();
    expect(screen.getByText("51.4% to 53.1%")).toBeTruthy();
  });

  it("leaves out a deck with fewer than 20 decided matches", () => {
    const gated = {
      ...DECKS[2],
      matchWinRate: { ...DECKS[2].matchWinRate, wins: 9, losses: 3 },
    };

    render(<WinRateScatter decks={[DECKS[0], DECKS[1], gated]} />);

    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.queryByText("Monster Tron")).toBeNull();
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
    expect(screen.getByText(/^Bubble area is player count\./)).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
