import type { MatchupCell, MatchupMatrix } from "../../api/types";
import { neededText } from "../../helpers";

export type CellState =
  "mirror" | "none" | "gated" | "win" | "loss" | "neutral";

type Cells = MatchupMatrix["cells"];

type RangedCell = Extract<MatchupCell, { gate: null }>;

const VERDICT: Record<CellState, string> = {
  mirror: "mirror match",
  none: "no data",
  gated: "too few to call",
  win: "clear result",
  loss: "clear result",
  neutral: "within the range of chance",
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
  const rate =
    cell === undefined || cell.rate === null
      ? ""
      : ` ${Math.round(cell.rate * 100)}%,`;

  const count =
    state === "gated" && cell !== undefined
      ? `, ${neededText(cell.wins + cell.losses, "matches")}`
      : "";

  return `${rowName} against ${columnName}:${rate} ${VERDICT[state]}${count}`;
}
