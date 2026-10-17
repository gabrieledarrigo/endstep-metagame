import type { Deck } from "../api/types";

/**
 * Builds the address of a deck's key card art crop.
 *
 * @param art - The deck's `art`, as the metagame function returns it.
 * @returns Scryfall's address from `art.imageUrl` when the function added one, otherwise Endstep's image endpoint for `art.cardName`, which redirects to Scryfall, §3.4.
 */
export function artSource(art: Deck["art"]): string {
  if (art.imageUrl) {
    return art.imageUrl;
  }

  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: art.cardName,
    version: "art_crop",
  })}`;
}
