import { describe, expect, it } from "vitest";
import {
  axisShare,
  formatCount,
  formatPopulation,
  formatWindow,
  longDay,
  percent,
  shortDay,
  tooltipShare,
  winRateText,
} from "./format";

function range(from: string, to: string): { from: string; to: string } {
  return { from, to };
}

describe("formatCount", () => {
  it("separates thousands with commas", () => {
    expect(formatCount(236728)).toBe("236,728");
    expect(formatCount(40)).toBe("40");
  });
});

describe("percent", () => {
  it("turns a rate into a percentage with one decimal", () => {
    expect(percent(0.5224711653188386)).toBe("52.2%");
    expect(percent(1)).toBe("100.0%");
  });
});

describe("axisShare", () => {
  it("adds a percent sign to the value as it is", () => {
    expect(axisShare(5)).toBe("5%");
  });
});

describe("tooltipShare", () => {
  it("formats a share in percent with two decimals", () => {
    expect(tooltipShare(9.559072015)).toBe("9.56%");
  });
});

describe("winRateText", () => {
  it("formats a win rate in percent with one decimal", () => {
    expect(winRateText(46.93565780014378)).toBe("46.9%");
  });
});

describe("shortDay", () => {
  it("keeps the month and the day", () => {
    expect(shortDay("2026-10-07")).toBe("10-07");
  });
});

describe("longDay", () => {
  it("writes the date in full, in British English", () => {
    expect(longDay("2026-10-07")).toBe("7 October 2026");
  });
});

describe("formatWindow", () => {
  it("ends on the last covered day, the day before the exclusive end", () => {
    expect(formatWindow(range("2026-09-06", "2026-10-06"))).toBe(
      "6 Sep to 5 Oct 2026",
    );
  });

  it("gives the first date its year when the years differ", () => {
    expect(formatWindow(range("2025-12-15", "2026-01-14"))).toBe(
      "15 Dec 2025 to 13 Jan 2026",
    );
  });

  it("counts a window that ends on the first of the year as ending in the year before", () => {
    expect(formatWindow(range("2025-12-02", "2026-01-01"))).toBe(
      "2 Dec to 31 Dec 2025",
    );
  });
});

describe("formatPopulation", () => {
  it("capitalises the population", () => {
    expect(formatPopulation("rated")).toBe("Rated");
    expect(formatPopulation("casual")).toBe("Casual");
  });
});
