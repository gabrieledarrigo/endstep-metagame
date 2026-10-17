import { formatCount } from "./format";

const SHORTEST_TERM = 2;

/**
 * Normalises a deck search term, so the variants of one term share one request and one cache entry, FR-14.
 *
 * @param raw - The text in the search field, or the `q` parameter, which may be missing.
 * @returns The term trimmed, with its inner spaces collapsed and its letters lowercased, or `null` when that leaves fewer than 2 characters.
 */
export function searchTerm(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }

  const term = raw.trim().replace(/\s+/g, " ").toLowerCase();

  if (term.length < SHORTEST_TERM) {
    return null;
  }

  return term;
}

/**
 * Puts a search term in curly quotes, the way the overview names it in its copy.
 *
 * @param term - The search term.
 * @returns The term in curly quotes, such as `“altar”`.
 */
export function quoted(term: string): string {
  return `\u201c${term}\u201d`;
}

/**
 * Words the count of a deck search's matches, once for the result line and the status line, FR-14.
 *
 * @param total - The number of decks that match.
 * @param term - The normalised search term.
 * @returns The count, such as `9 decks`, and the rest of the sentence, such as `match “altar”.`.
 */
export function matchText(
  total: number,
  term: string,
): { count: string; rest: string } {
  if (total === 1) {
    return { count: "1 deck", rest: `matches ${quoted(term)}.` };
  }

  return {
    count: `${formatCount(total)} decks`,
    rest: `match ${quoted(term)}.`,
  };
}
