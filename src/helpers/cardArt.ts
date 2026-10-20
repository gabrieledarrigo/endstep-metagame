/**
 * Builds the address of a card's art crop: a deck's key card, or a staple.
 *
 * @param art - The card's name, and the Scryfall address a function added for it, if any.
 * @returns Scryfall's address from `art.imageUrl` when the function added one, otherwise Endstep's image endpoint for `art.cardName`, which redirects to Scryfall, §3.4.
 */
export function artSource(art: {
  cardName: string;
  imageUrl?: string;
}): string {
  if (art.imageUrl) {
    return art.imageUrl;
  }

  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: art.cardName,
    version: "art_crop",
  })}`;
}
