const GAP = 8;

/**
 * Places a table's tooltip beside the cell it describes, inside the frame that holds both: to the right of the cell, or to its left when there is no room, or below it when neither side fits.
 *
 * @param tooltip - The tooltip, absolutely positioned inside the frame.
 * @param frame - The positioned element that holds the table and the tooltip.
 * @param cell - The cell the tooltip describes.
 */
export function placeTooltip(
  tooltip: HTMLElement,
  frame: HTMLElement,
  cell: HTMLElement,
): void {
  const box = frame.getBoundingClientRect();
  const target = cell.getBoundingClientRect();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;

  let left = target.right - box.left + GAP;
  let top = target.top - box.top;

  if (left + width > box.width) {
    left = target.left - box.left - width - GAP;
  }

  if (left < 0) {
    left = Math.max(0, Math.min(target.left - box.left, box.width - width));
    top = target.bottom - box.top + GAP;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(0, Math.min(top, box.height - height))}px`;
}
