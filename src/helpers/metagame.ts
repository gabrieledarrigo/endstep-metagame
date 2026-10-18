import type { MatrixDeck } from "../api/types";
import { toPoints } from "./expectedRate";
import { findDeck } from "./slug";

const MOST_CHANGE = 100;
const ENTRY = /^(.+):(-?\d{1,3})$/;

function snap(rate: number): number {
  return Math.round(rate * 1e6) / 1e6;
}

function shareOf(deck: MatrixDeck, change: number): number {
  return Math.max(0, snap(deck.share + change / 100));
}

/**
 * Reads the reader's changes to the metagame from the `meta` parameter, FR-17.
 *
 * Each entry is `{slug}:{change}`, the change a whole number of points. An entry that cannot be read, has a change of zero or outside −100 to 100, names no deck in `decks`, or repeats a deck already read is ignored. Decks are matched by their slug's suffix. A change that lowers a share past zero counts as the share rounded up. A lower on a deck already at zero is ignored, and it still counts as that deck's entry. Changes that would leave every share at zero are all ignored.
 *
 * @param value - The parameter's value, such as `affinity-e93f5f74:-4,elves-262fdcbd:3`, or `null` when the address has none.
 * @param decks - The window's decks, with their shares as rates.
 * @returns The changes that apply, in points, by each deck's current slug. Empty when none apply.
 */
export function readMeta(
  value: string | null,
  decks: MatrixDeck[],
): Record<string, number> {
  const changes: Record<string, number> = {};
  const read = new Set<string>();

  for (const entry of (value ?? "").split(",")) {
    const match = ENTRY.exec(entry);

    if (match === null) {
      continue;
    }

    const change = Number(match[2]);
    const deck = findDeck(decks, match[1]);

    if (change === 0 || Math.abs(change) > MOST_CHANGE) {
      continue;
    }

    if (deck === undefined || read.has(deck.slug)) {
      continue;
    }

    read.add(deck.slug);
    const counted = Math.max(change, -Math.ceil(toPoints(deck.share)));

    if (counted === 0) {
      continue;
    }

    changes[deck.slug] = counted;
  }

  const shares = metagameShares(decks, changes);

  if (decks.every((deck) => shares[deck.slug] === 0)) {
    return {};
  }

  return changes;
}

/**
 * Writes the reader's changes to the metagame as the `meta` parameter's value, FR-17.
 *
 * @param changes - The changes in points, by slug.
 * @param decks - The window's decks, in share order.
 * @returns The changed decks in share order, such as `affinity-e93f5f74:-4,elves-262fdcbd:3`, with no sign on a raise. Empty when nothing has changed, or when the changes name none of `decks`.
 */
export function writeMeta(
  changes: Record<string, number>,
  decks: MatrixDeck[],
): string {
  return decks
    .filter((deck) => (changes[deck.slug] ?? 0) !== 0)
    .map((deck) => `${deck.slug}:${changes[deck.slug]}`)
    .join(",");
}

/**
 * Applies the reader's changes to the window's shares, FR-17.
 *
 * @param decks - The window's decks, with their shares as rates.
 * @param changes - The changes in points, by slug.
 * @returns Each deck's share as a rate, by slug, moved by its change and never below zero.
 */
export function metagameShares(
  decks: MatrixDeck[],
  changes: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    decks.map((deck) => [deck.slug, shareOf(deck, changes[deck.slug] ?? 0)]),
  );
}

/**
 * Says whether a stepper's button can act, FR-17.
 *
 * "Less" cannot act on a share at zero, or on the last deck above zero, so the metagame is never empty. "More" cannot act once the change is 100 points, the most the address holds.
 *
 * @param decks - The window's decks, with their shares as rates.
 * @param changes - The changes in points, by slug.
 * @param slug - The deck the button moves.
 * @param step - `-1` for "Less", `1` for "More".
 * @returns `true` when a press would move the share.
 */
export function canStep(
  decks: MatrixDeck[],
  changes: Record<string, number>,
  slug: string,
  step: 1 | -1,
): boolean {
  if (step === 1) {
    return (changes[slug] ?? 0) < MOST_CHANGE;
  }

  const shares = metagameShares(decks, changes);
  const others = decks.filter(
    (deck) => deck.slug !== slug && shares[deck.slug] > 0,
  );

  return shares[slug] > 0 && others.length > 0;
}
