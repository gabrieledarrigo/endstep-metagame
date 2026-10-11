import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import { statTiles } from "../../../test/statTiles";
import type { DeckDetail } from "../../api/types";
import { DeckTexture } from "./DeckTexture";

describe("DeckTexture", () => {
  it("gives the average turns, the opening hand and the mulligan rate", () => {
    render(<DeckTexture texture={(detail as DeckDetail).texture} />);

    expect(statTiles()).toEqual([
      "Average turns: 15.1",
      "Opening hand: 6.6 cards",
      "Mulligan rate: 33.8% / 18,566 of 54,880 games",
    ]);
  });
});
