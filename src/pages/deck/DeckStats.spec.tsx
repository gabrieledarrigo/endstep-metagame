import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import { statTiles } from "../../../test/statTiles";
import type { DeckDetail } from "../../api/types";
import { DeckStats } from "./DeckStats";

const DECK = (detail as DeckDetail).deck;

describe("DeckStats", () => {
  it("leads with the match win rate and its range, then share, players, matches and the change", () => {
    render(<DeckStats deck={DECK} />);

    expect(statTiles()).toEqual([
      "Match win rate: 52.0% / 51.3% to 52.8%",
      "Meta share: 9.35%",
      "Players: 2,172",
      "Matches: 25,892",
      "Share change: ▲ 0.56 pts",
    ]);
  });

  it("reads a match win rate from fewer than 20 matches as too few to call", () => {
    render(
      <DeckStats
        deck={{
          ...DECK,
          matchWinRate: { ...DECK.matchWinRate, wins: 7, losses: 5 },
        }}
      />,
    );

    expect(statTiles()[0]).toBe(
      "Match win rate: Too few to call / 12 of the 20 matches needed",
    );
  });
});
