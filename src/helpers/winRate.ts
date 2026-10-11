import { percent } from "./format";

export const DECIDED_NEEDED = 20;

type WinLossBlock = {
  wins: number;
  losses: number;
  rate: number | null;
  low: number | null;
  high: number | null;
  gate?: string | null;
};

export type ReadRate =
  | { gated: true; decided: number }
  | { gated: false; decided: number; rate: number; low: number; high: number };

/**
 * Applies the 20-match rule to a win and loss block, §6.8.
 *
 * A block Endstep gates is gated, and so is any block with fewer than 20 decided results, such as `deck.matchWinRate`, which carries no gate of its own.
 *
 * @param block - A win and loss block from Endstep.
 * @returns The rate and its range, or `gated: true` when the block is too few to call. Both carry the decided count.
 */
export function readRate(block: WinLossBlock): ReadRate {
  const decided = block.wins + block.losses;
  const { rate, low, high } = block;

  if (
    block.gate ||
    decided < DECIDED_NEEDED ||
    rate === null ||
    low === null ||
    high === null
  ) {
    return { gated: true, decided };
  }

  return { gated: false, decided, rate, low, high };
}

/**
 * Says how far a gated block is from the 20 decided results it needs.
 *
 * @param decided - The block's decided count.
 * @param unit - What the block counts.
 * @returns A phrase such as `12 of the 20 matches needed`.
 */
export function neededText(decided: number, unit: "matches" | "games"): string {
  return `${decided} of the ${DECIDED_NEEDED} ${unit} needed`;
}

/**
 * Writes a win and loss block's rate for a table or a card, under the 20-match rule.
 *
 * @param block - A win and loss block from Endstep.
 * @returns The rate with one decimal, such as `52.2%`, or the decided count against the 20 needed, such as `Too few to call, 12 of 20`.
 */
export function rateText(block: WinLossBlock): string {
  const read = readRate(block);

  return read.gated
    ? `Too few to call, ${read.decided} of ${DECIDED_NEEDED}`
    : percent(read.rate);
}
