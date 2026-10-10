/**
 * Builds the address of a card's art crop, served by Endstep.
 *
 * @param cardName - The card's name, such as `Reckoner's Bargain`.
 * @returns The image URL.
 */
export function artSource(cardName: string): string {
  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: cardName,
    version: "art_crop",
  })}`;
}
