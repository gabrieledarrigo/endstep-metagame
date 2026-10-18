import { describe, expect, it } from "vitest";
import { placeCardPreview } from "./placeCardPreview";

type Box = { left: number; top: number; right: number; bottom: number };

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, right: left + width, bottom: top + height };
}

const WIDE = { width: 1280, height: 800 };

describe("placeCardPreview", () => {
  it("puts the preview right of the panel, 16px from it, level with the name", () => {
    expect(
      placeCardPreview(box(620, 300, 120, 20), box(600, 100, 300, 900), WIDE),
    ).toEqual({ left: 916, top: 300 });
  });

  it("puts it left of the panel when the right has no room, as at 1,280px", () => {
    expect(
      placeCardPreview(box(940, 300, 120, 20), box(920, 100, 300, 900), WIDE),
    ).toEqual({ left: 660, top: 300 });
  });

  it("puts it right of the name when neither side of the panel has room, as at 1,024px", () => {
    expect(
      placeCardPreview(box(60, 300, 120, 20), box(20, 100, 984, 900), {
        width: 1024,
        height: 768,
      }),
    ).toEqual({ left: 196, top: 300 });
  });

  it("puts it left of the name when the name's right has no room, so it does not cover the name", () => {
    expect(
      placeCardPreview(box(280, 300, 60, 20), box(20, 100, 320, 900), {
        width: 360,
        height: 640,
      }),
    ).toEqual({ left: 20, top: 288 });
  });

  it("keeps a preview beside a name with no room on either side 12px inside the window", () => {
    expect(
      placeCardPreview(box(60, 300, 240, 20), box(20, 100, 320, 900), {
        width: 360,
        height: 640,
      }),
    ).toEqual({ left: 104, top: 288 });
  });

  it("keeps the whole card 12px inside the bottom and the top of the window", () => {
    expect(
      placeCardPreview(box(940, 700, 120, 20), box(920, 100, 300, 900), WIDE),
    ).toEqual({ left: 660, top: 448 });
    expect(
      placeCardPreview(box(940, -10, 120, 20), box(920, -300, 300, 900), WIDE),
    ).toEqual({ left: 660, top: 12 });
  });

  it("places nothing once the name has left the window", () => {
    const panel = box(920, -300, 300, 1400);

    expect(placeCardPreview(box(940, -20, 120, 20), panel, WIDE)).toBeNull();
    expect(placeCardPreview(box(940, 800, 120, 20), panel, WIDE)).toBeNull();
    expect(
      placeCardPreview(box(940, -19, 120, 20), panel, WIDE),
    ).not.toBeNull();
  });
});
