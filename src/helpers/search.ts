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
