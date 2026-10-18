type Box = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

type Spot = { left: number; top: number };

const WIDTH = 244;
const HEIGHT = 340;
const GAP = 16;
const MARGIN = 12;

/**
 * Places a card's preview level with the card's name and inside the window, FR-19: right of the sample list panel, or left of it, or right of the name, or left of it, and when none has room, as close to the name's right as the window allows.
 *
 * @param name - The bounds of the card's name, in window coordinates.
 * @param panel - The bounds of the sample list panel, in window coordinates.
 * @param viewport - The width and height of the window, without its scroll bars.
 * @returns The preview's left and top edges in window coordinates, or `null` when the name is outside the window.
 */
export function placeCardPreview(
  name: Box,
  panel: Box,
  viewport: { width: number; height: number },
): Spot | null {
  if (name.bottom <= 0 || name.top >= viewport.height) {
    return null;
  }

  const top = Math.max(
    MARGIN,
    Math.min(name.top, viewport.height - MARGIN - HEIGHT),
  );

  if (panel.right + GAP + WIDTH <= viewport.width - MARGIN) {
    return { left: panel.right + GAP, top };
  }

  if (panel.left - GAP - WIDTH >= MARGIN) {
    return { left: panel.left - GAP - WIDTH, top };
  }

  if (name.right + GAP + WIDTH <= viewport.width - MARGIN) {
    return { left: name.right + GAP, top };
  }

  if (name.left - GAP - WIDTH >= MARGIN) {
    return { left: name.left - GAP - WIDTH, top };
  }

  const left = Math.max(
    MARGIN,
    Math.min(name.right + GAP, viewport.width - MARGIN - WIDTH),
  );

  return { left, top };
}
