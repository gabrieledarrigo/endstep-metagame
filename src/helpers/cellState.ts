import i18next from "i18next";
import type { MatchupCell, MatchupMatrix, MatrixDeck } from "../api/types";
import { neededText } from "./winRate";

export type CellState =
  "mirror" | "none" | "gated" | "win" | "loss" | "neutral";

type Cells = MatchupMatrix["cells"];

type RangedCell = Extract<MatchupCell, { gate: null }>;

export type BeatingDeck = {
  deck: MatrixDeck;
  rate: number;
  low: number;
  high: number;
};

/**
 * Reads one deck's record against another.
 *
 * @param cells - The matrix's cells.
 * @param row - The slug of the deck whose record it is.
 * @param column - The slug of its opponent.
 * @returns The record, or `undefined` when the pair has no entry in this direction.
 */
export function cellOf(
  cells: Cells,
  row: string,
  column: string,
): MatchupCell | undefined {
  return cells[row]?.[column];
}

/**
 * Decides whether a pair is a clear result, FR-12: it has at least one range, and every range present for it excludes 50%.
 *
 * @param cells - The matrix's cells.
 * @param a - The slug of one deck of the pair.
 * @param b - The slug of the other.
 * @returns `true` when the pair is clear. The answer is the same for both directions.
 */
export function isClearPair(cells: Cells, a: string, b: string): boolean {
  const ranges = [cellOf(cells, a, b), cellOf(cells, b, a)].filter(
    (cell): cell is RangedCell => cell?.gate === null,
  );

  return (
    ranges.length > 0 &&
    ranges.every((cell) => cell.low > 0.5 || cell.high < 0.5)
  );
}

/**
 * Classifies a cell of the matchup table, FR-12.
 *
 * @param cells - The matrix's cells.
 * @param row - The slug of the row deck.
 * @param column - The slug of the column deck.
 * @returns `mirror` on the diagonal, `none` for a pair with no entry, `gated` below 20 decided matches, `win` or `loss` for the row deck's side of a clear pair, and `neutral` otherwise.
 */
export function cellState(
  cells: Cells,
  row: string,
  column: string,
): CellState {
  if (row === column) {
    return "mirror";
  }

  const cell = cellOf(cells, row, column);

  if (cell === undefined) {
    return "none";
  }

  if (cell.gate !== null) {
    return "gated";
  }

  if (!isClearPair(cells, row, column)) {
    return "neutral";
  }

  return cell.rate > 0.5 ? "win" : "loss";
}

/**
 * Describes a cell in words, for its accessible name.
 *
 * @param rowName - The row deck's name.
 * @param columnName - The column deck's name.
 * @param state - The cell's state.
 * @param cell - The row deck's record against the column deck, when there is one.
 * @returns A sentence such as `Affinity against Elves: 35%, clear result`. A gated cell adds its decided matches against the 20 needed, §6.8.
 */
export function cellSummary(
  rowName: string,
  columnName: string,
  state: CellState,
  cell: MatchupCell | undefined,
): string {
  const verdict =
    state === "gated" && cell !== undefined
      ? i18next.t("helpers.cellState.gatedVerdict", {
          needed: neededText(cell.wins + cell.losses, "matches"),
        })
      : i18next.t(`helpers.cellState.verdict.${state}`);

  if (cell === undefined || cell.rate === null) {
    return i18next.t("helpers.cellState.summary", {
      row: rowName,
      column: columnName,
      verdict,
    });
  }

  return i18next.t("helpers.cellState.summaryWithRate", {
    row: rowName,
    column: columnName,
    rate: Math.round(cell.rate * 100),
    verdict,
  });
}

/**
 * Writes what a cell of the matchup table shows, FR-12.
 *
 * @param state - The cell's state.
 * @param cell - The row deck's record against the column deck, when there is one.
 * @returns The rate as a whole percentage without its sign, such as `57`. A dot for no data, and nothing for a gated cell or the mirror.
 */
export function cellText(
  state: CellState,
  cell: MatchupCell | undefined,
): string {
  if (state === "none") {
    return "·";
  }

  if (state === "mirror" || cell === undefined || cell.rate === null) {
    return "";
  }

  return String(Math.round(cell.rate * 100));
}

/**
 * Finds the decks that clearly beat a deck, FR-17: each deck whose cell against it is a clear result in its favour, FR-12.
 *
 * These are the decks whose cell in the deck's column of the matchup table is blue. A gated pair, a pair with no entry in the beating deck's direction, and the mirror never count.
 *
 * @param matrix - The matchup response, §4.4.
 * @param slug - The slug of the deck to beat, as the matrix writes it.
 * @returns Each beating deck with its rate and range against the deck, from its own cell. Highest rate first, ties in the matrix's share order.
 */
export function decksThatBeat(
  matrix: MatchupMatrix,
  slug: string,
): BeatingDeck[] {
  const beating = matrix.decks.flatMap((deck) => {
    const cell = cellOf(matrix.cells, deck.slug, slug);

    if (
      cell === undefined ||
      cell.gate !== null ||
      cellState(matrix.cells, deck.slug, slug) !== "win"
    ) {
      return [];
    }

    return [{ deck, rate: cell.rate, low: cell.low, high: cell.high }];
  });

  return beating.sort((a, b) => b.rate - a.rate);
}
