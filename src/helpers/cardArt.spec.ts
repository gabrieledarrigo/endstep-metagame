import { describe, expect, it } from "vitest";
import { artSource } from "./cardArt";

describe("artSource", () => {
  it("asks Endstep for the card's art crop, with the name encoded", () => {
    expect(artSource("Reckoner's Bargain")).toBe(
      "https://endstep.cc/api/cards/image?name=Reckoner%27s+Bargain&version=art_crop",
    );
  });
});
