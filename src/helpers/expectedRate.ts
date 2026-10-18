import type { MatchupMatrix, MatrixDeck } from "../api/types";
import { type CellState, cellOf } from "./cellState";

export type Verdict = Extract<CellState, "win" | "loss" | "neutral">;

export type RankedDeck = {
  deck: MatrixDeck;
  rate: number;
  low: number;
  high: number;
  verdict: Verdict;
};

type Reading = { rate: number; error: number };

const EVEN = 0.5;
const UNKNOWN_ERROR = 0.25;
const Z = 1.96;
const MOST_PICKED = 3;
const SCALE_STEP = 5;

function readCell(
  cells: MatchupMatrix["cells"],
  row: string,
  column: string,
): Reading {
  if (row === column) {
    return { rate: EVEN, error: 0 };
  }

  const cell = cellOf(cells, row, column);

  if (cell === undefined || cell.gate !== null) {
    return { rate: EVEN, error: UNKNOWN_ERROR };
  }

  return { rate: cell.rate, error: (cell.high - cell.low) / (2 * Z) };
}

function clamp(rate: number): number {
  return Math.min(1, Math.max(0, rate));
}

function verdictOf(low: number, high: number): Verdict {
  if (low > EVEN) {
    return "win";
  }

  if (high < EVEN) {
    return "loss";
  }

  return "neutral";
}

function toPoints(rate: number): number {
  return Math.round(rate * 1e6) / 1e4;
}

/**
 * Ranks the decks of a matchup matrix by their expected match win rate against a metagame, FR-17.
 *
 * Each opponent weighs its part of the metagame's total share. The mirror counts as 50%. So do a gated pair and a pair with no entry, which also add an error of 0.25. The range is 1.96 times the square root of the sum of each weighted error squared, where a cell's error is its range divided by 3.92.
 *
 * @param matrix - The matchup response, §4.4.
 * @param shares - Each deck's share of the metagame, by slug, as a rate. A deck left out counts as zero. The shares must not all be zero.
 * @returns Every deck of the matrix with its rate, its range clamped to 0 and 1, and its verdict: `win` when the whole range is above 50%, `loss` when it is below, and `neutral` otherwise. Highest rate first, ties in the matrix's share order.
 */
export function rankDecks(
  matrix: MatchupMatrix,
  shares: Record<string, number>,
): RankedDeck[] {
  const { decks, cells } = matrix;
  const total = decks.reduce((sum, deck) => sum + (shares[deck.slug] ?? 0), 0);

  const ranked = decks.map((deck) => {
    let rate = 0;
    let variance = 0;

    for (const opponent of decks) {
      const weight = (shares[opponent.slug] ?? 0) / total;
      const reading = readCell(cells, deck.slug, opponent.slug);

      rate += weight * reading.rate;
      variance += (weight * reading.error) ** 2;
    }

    const spread = Z * Math.sqrt(variance);
    const low = clamp(rate - spread);
    const high = clamp(rate + spread);

    return { deck, rate, low, high, verdict: verdictOf(low, high) };
  });

  return ranked.sort((a, b) => b.rate - a.rate);
}

/**
 * Picks the decks to play from a ranking, FR-17.
 *
 * A deck is too close to the best when the top of its range is above the bottom of the best deck's range. The pick takes such decks in rate order from second place, and stops at the first deck that is not too close.
 *
 * @param ranking - The decks by expected rate, highest first, from `rankDecks`.
 * @returns The best deck and the decks too close to it, three at most, and how many more decks in that run are just as close. No decks for an empty ranking.
 */
export function pickDecks(ranking: RankedDeck[]): {
  decks: RankedDeck[];
  more: number;
} {
  const best = ranking[0];
  const end = ranking.findIndex(
    (entry, index) => index > 0 && entry.high <= best.low,
  );
  const run = end === -1 ? ranking : ranking.slice(0, end);

  return {
    decks: run.slice(0, MOST_PICKED),
    more: Math.max(0, run.length - MOST_PICKED),
  };
}

/**
 * Finds the scale that range bars share, FR-17: from the lowest bound to the highest, rounded out to 5 points and always holding 50%.
 *
 * @param ranges - The ranges to draw, as rates.
 * @returns The scale's ends as rates, such as `{ min: 0.35, max: 0.6 }`.
 */
export function rangeScale(ranges: { low: number; high: number }[]): {
  min: number;
  max: number;
} {
  const lowest = Math.min(EVEN, ...ranges.map((range) => range.low));
  const highest = Math.max(EVEN, ...ranges.map((range) => range.high));

  return {
    min: (Math.floor(toPoints(lowest) / SCALE_STEP) * SCALE_STEP) / 100,
    max: (Math.ceil(toPoints(highest) / SCALE_STEP) * SCALE_STEP) / 100,
  };
}
