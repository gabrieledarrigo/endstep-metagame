import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import { statTiles } from "../../../test/statTiles";
import type { DeckDetail } from "../../api/types";
import { DeckToss } from "./DeckToss";

const PLAY_DRAW = (detail as DeckDetail).playDraw;

describe("DeckToss", () => {
  it("gives the game win rate after each side of the toss, and how often players chose to draw", () => {
    render(<DeckToss playDraw={PLAY_DRAW} />);

    expect(statTiles()).toEqual([
      "Won the toss: 53.3% / 12,623 games",
      "Lost the toss: 49.9% / 12,951 games",
      "Chose to draw: 0.4% / 47 of 12,623 tosses won",
    ]);
  });

  it("reads a gated toss as too few to call, never as 0%", () => {
    render(
      <DeckToss
        playDraw={{
          ...PLAY_DRAW,
          tossWon: {
            wins: 4,
            losses: 5,
            required: 20,
            gate: "too_few",
            rate: null,
            low: null,
            high: null,
            deff: null,
          },
        }}
      />,
    );

    expect(statTiles()[0]).toBe(
      "Won the toss: Too few to call / 9 of the 20 games needed",
    );
  });

  it("says the choice to draw is not available when no toss was won", () => {
    render(
      <DeckToss
        playDraw={{
          ...PLAY_DRAW,
          choseToDraw: { count: 0, of: 0, rate: 0 },
        }}
      />,
    );

    expect(statTiles()[2]).toBe(
      "Chose to draw: Not available / 0 of 0 tosses won",
    );
  });
});
