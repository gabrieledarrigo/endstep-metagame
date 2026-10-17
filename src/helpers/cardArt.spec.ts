import { describe, expect, it } from "vitest";
import type { Deck } from "../api/types";
import { artSource } from "./cardArt";

const ART: Deck["art"] = {
  cardName: "Reckoner's Bargain",
  setCode: null,
  collectorNumber: null,
  pinned: false,
};

const SCRYFALL =
  "https://cards.scryfall.io/art_crop/front/6/3/6338942d-d650-4571-8ec6-4d658792c53e.jpg?1783923877";

describe("artSource", () => {
  it("uses the Scryfall address the metagame function added", () => {
    expect(artSource({ ...ART, imageUrl: SCRYFALL })).toBe(SCRYFALL);
  });

  it("falls back to Endstep's art crop, with the name encoded", () => {
    expect(artSource(ART)).toBe(
      "https://endstep.cc/api/cards/image?name=Reckoner%27s+Bargain&version=art_crop",
    );
  });
});
