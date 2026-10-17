const SUFFIX_LENGTH = 8;

/**
 * Reads the part of a deck slug that stays when the deck is renamed, §6.11.
 *
 * @param slug - A deck slug, such as `affinity-e93f5f74`.
 * @returns The 8 characters after the last hyphen, such as `e93f5f74`, or `null` when the slug does not end in them.
 */
export function slugSuffix(slug: string): string | null {
  const hyphen = slug.lastIndexOf("-");
  const suffix = slug.slice(hyphen + 1);

  if (hyphen < 1 || suffix.length !== SUFFIX_LENGTH) {
    return null;
  }

  return suffix;
}

/**
 * Finds a deck by its slug's suffix, so a slug under an old name still finds it, §6.11.
 *
 * @param decks - The decks to search.
 * @param slug - The slug to find, current or stale.
 * @returns The first deck whose slug has the same suffix, or `undefined` when none has, or when the slug has no suffix.
 */
export function findDeck<Item extends { slug: string }>(
  decks: Item[],
  slug: string,
): Item | undefined {
  const suffix = slugSuffix(slug);

  if (suffix === null) {
    return undefined;
  }

  return decks.find((deck) => slugSuffix(deck.slug) === suffix);
}
