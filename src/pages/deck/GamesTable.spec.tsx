import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import type { DeckDetail, WinLoss } from "../../api/types";
import { GamesTable } from "./GamesTable";

const RESULTS = (detail as DeckDetail).gameResults!;

const GATED: WinLoss = {
  wins: 6,
  losses: 8,
  required: 20,
  gate: "too_few",
  rate: null,
  low: null,
  high: null,
  deff: null,
};

describe("GamesTable", () => {
  it("gives the game win rate by game and by who played first, with the totals", () => {
    render(<GamesTable results={RESULTS} />);

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual([
      "On the playOn the drawTotal",
      "Game 153.3%49.9%51.6%",
      "Game 248.6%54.4%51.6%",
      "Game 352.2%50.5%51.3%",
      "All games51.4%51.8%51.6%",
    ]);
    expect(
      screen.getByText("Every game has a play or draw record."),
    ).toBeTruthy();
    expect(screen.queryByText(/A hatched cell/)).toBeNull();
  });

  it("names each cell with its figures, and shows them in the detail on focus", () => {
    render(<GamesTable results={RESULTS} />);

    const cell = screen.getByRole("cell", {
      name: "Game 1, on the play: game win rate 53.3%, range 52.2% to 54.4%, 6,733 wins, 5,894 losses",
    });
    act(() => {
      cell.focus();
    });

    expect(screen.getByRole("tooltip").textContent).toBe(
      "Game 1, on the playGame win rate53.3%Range52.2% to 54.4%Wins6,733Losses5,894",
    );

    fireEvent.blur(cell, { relatedTarget: document.body });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reads a gated cell as too few to call, empty, with the count in its name and detail", () => {
    render(
      <GamesTable
        results={{
          ...RESULTS,
          rows: [{ ...RESULTS.rows[2], onDraw: GATED }],
          unknownPositionGames: 52,
        }}
      />,
    );

    const cell = screen.getByRole("cell", {
      name: "Game 3, on the draw: too few to call, 14 of the 20 games needed",
    });
    expect(cell.textContent).toBe("");
    fireEvent.mouseEnter(cell);
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Game 3, on the drawWins6Losses8Too few to call: 14 of the 20 games needed.",
    );
    expect(
      screen.getByText(
        "52 games have no play or draw record and count only in the totals.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "A hatched cell has fewer than 20 decided games, too few to call.",
      ),
    ).toBeTruthy();
  });

  it("goes back to the focused cell's detail when the pointer leaves the table", () => {
    render(<GamesTable results={RESULTS} />);
    const focusedCell = screen.getByRole("cell", {
      name: /^Game 1, on the play:/,
    });
    act(() => {
      focusedCell.focus();
    });

    fireEvent.mouseEnter(
      screen.getByRole("cell", { name: /^All games, total:/ }),
    );
    expect(screen.getByRole("tooltip").textContent).toMatch(
      /^All games, total/,
    );

    fireEvent.mouseLeave(screen.getByRole("table"));
    expect(screen.getByRole("tooltip").textContent).toMatch(
      /^Game 1, on the play/,
    );
  });

  it("updates the detail of the focused cell when the results change under it", () => {
    const { rerender } = render(<GamesTable results={RESULTS} />);
    act(() => {
      screen.getByRole("cell", { name: /^Game 1, on the play:/ }).focus();
    });

    rerender(
      <GamesTable
        results={{
          ...RESULTS,
          rows: [
            { ...RESULTS.rows[0], onPlay: GATED },
            ...RESULTS.rows.slice(1),
          ],
        }}
      />,
    );

    expect(screen.getByRole("tooltip").textContent).toBe(
      "Game 1, on the playWins6Losses8Too few to call: 14 of the 20 games needed.",
    );
  });

  it("says when game results are not available", () => {
    render(<GamesTable results={null} />);

    expect(
      screen.getByText("Game results are not available for this window."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
