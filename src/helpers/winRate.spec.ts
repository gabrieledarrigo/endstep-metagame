import { describe, expect, it } from "vitest";
import { neededText, rateText, readRate } from "./winRate";

describe("readRate", () => {
  it("reads the rate and range of a block with 20 or more decided results", () => {
    expect(
      readRate({
        wins: 12,
        losses: 8,
        rate: 0.6,
        low: 0.4,
        high: 0.78,
        gate: null,
      }),
    ).toEqual({ gated: false, decided: 20, rate: 0.6, low: 0.4, high: 0.78 });
  });

  it("gates a block Endstep gates", () => {
    expect(
      readRate({
        wins: 6,
        losses: 8,
        rate: null,
        low: null,
        high: null,
        gate: "too_few",
      }),
    ).toEqual({ gated: true, decided: 14 });
  });

  it("gates a block with no gate field and fewer than 20 decided results, whatever its rate says", () => {
    expect(
      readRate({ wins: 9, losses: 3, rate: 0.75, low: 0.47, high: 0.91 }),
    ).toEqual({ gated: true, decided: 12 });
  });

  it("gates a block without a rate or a range, however many results it has", () => {
    expect(
      readRate({ wins: 15, losses: 10, rate: null, low: null, high: null }),
    ).toEqual({ gated: true, decided: 25 });
    expect(
      readRate({ wins: 15, losses: 10, rate: 0.6, low: null, high: 0.78 }),
    ).toEqual({ gated: true, decided: 25 });
  });
});

describe("neededText", () => {
  it("states the decided count against the 20 needed", () => {
    expect(neededText(12, "matches")).toBe("12 of the 20 matches needed");
    expect(neededText(9, "games")).toBe("9 of the 20 games needed");
  });
});

describe("rateText", () => {
  it("writes the rate with one decimal, or too few to call", () => {
    expect(
      rateText({ wins: 30, losses: 20, rate: 0.6, low: 0.46, high: 0.73 }),
    ).toBe("60.0%");
    expect(
      rateText({ wins: 9, losses: 3, rate: 0.75, low: 0.47, high: 0.91 }),
    ).toBe("Too few to call, 12 of 20");
  });
});
