import { describe, expect, it } from "vitest";
import { placeTooltip } from "./placeTooltip";

function box(
  left: number,
  top: number,
  width: number,
  height: number,
): HTMLElement {
  const element = document.createElement("div");
  element.getBoundingClientRect = (): DOMRect =>
    DOMRect.fromRect({ x: left, y: top, width, height });
  Object.defineProperty(element, "offsetWidth", { value: width });
  Object.defineProperty(element, "offsetHeight", { value: height });

  return element;
}

function place(cellLeft: number, cellTop: number): [string, string] {
  const tooltip = box(0, 0, 200, 120);
  placeTooltip(
    tooltip,
    box(100, 50, 1000, 600),
    box(cellLeft, cellTop, 32, 28),
  );

  return [tooltip.style.left, tooltip.style.top];
}

describe("placeTooltip", () => {
  it("puts the tooltip to the right of the cell, level with it", () => {
    expect(place(300, 200)).toEqual(["240px", "150px"]);
  });

  it("puts it to the left when the right has no room", () => {
    expect(place(950, 200)).toEqual(["642px", "150px"]);
  });

  it("puts it below when neither side has room", () => {
    const tooltip = box(0, 0, 900, 120);
    placeTooltip(tooltip, box(100, 50, 1000, 600), box(500, 200, 32, 28));

    expect([tooltip.style.left, tooltip.style.top]).toEqual(["100px", "186px"]);
  });

  it("keeps the tooltip inside the frame's height", () => {
    expect(place(300, 600)).toEqual(["240px", "480px"]);
  });
});
