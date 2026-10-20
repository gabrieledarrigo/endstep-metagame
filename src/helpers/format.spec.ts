import { afterEach, describe, expect, it, vi } from "vitest";
import {
  axisShare,
  formatCopies,
  formatCount,
  formatDay,
  formatPopulation,
  formatPrice,
  formatProportion,
  formatShare,
  formatWindow,
  longDay,
  percent,
  shortDay,
  tooltipShare,
  wholePercent,
  winRateText,
} from "./format";

function range(from: string, to: string): { from: string; to: string } {
  return { from, to };
}

describe("formatCount", () => {
  it("separates thousands depending on the user locales", () => {
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

describe("wholePercent", () => {
  it("rounds a rate to a whole percentage", () => {
    expect(wholePercent(0.969)).toBe("97%");
    expect(wholePercent(0.0847)).toBe("8%");
    expect(wholePercent(0.05)).toBe("5%");
    expect(wholePercent(1)).toBe("100%");
  });

  it("rounds half up", () => {
    expect(wholePercent(0.125)).toBe("13%");
  });

  it("reads 100% just under all of the lists", () => {
    expect(wholePercent(0.999)).toBe("100%");
  });
});

describe("formatCopies", () => {
  it("formats a card's average copies with one decimal", () => {
    expect(formatCopies(3.94)).toBe("3.9 copies");
    expect(formatCopies(4)).toBe("4.0 copies");
    expect(formatCopies(1)).toBe("1.0 copies");
  });
});

describe("formatShare", () => {
  it("formats a share with one decimal", () => {
    expect(formatShare(0.0879)).toBe("8.8%");
    expect(formatShare(0.0005)).toBe("0.1%");
  });

  it("says a share above zero is under the shown precision, rather than zero", () => {
    expect(formatShare(0.0004)).toBe("<0.1%");
    expect(formatShare(0.0000191)).toBe("<0.1%");
  });

  it("keeps a share of zero as zero", () => {
    expect(formatShare(0)).toBe("0.0%");
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
    expect(tooltipShare(0.005)).toBe("0.01%");
  });

  it("says a share above zero is under the shown precision, rather than zero", () => {
    expect(tooltipShare(0.004)).toBe("<0.01%");
    expect(tooltipShare(0.00191)).toBe("<0.01%");
  });

  it("keeps a share of zero as zero", () => {
    expect(tooltipShare(0)).toBe("0.00%");
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

describe("formatDay", () => {
  it("writes the day and the short month", () => {
    expect(formatDay("2026-09-05")).toBe("5 Sept");
  });
});

describe("formatWindow", () => {
  it("ends on the last covered day, the day before the exclusive end", () => {
    expect(formatWindow(range("2026-09-06", "2026-10-06"))).toBe(
      "6 Sept to 5 Oct 2026",
    );
  });

  it("writes each day as a plain number, with no leading zero", () => {
    expect(formatWindow(range("2026-09-05", "2026-10-05"))).toBe(
      "5 Sept to 4 Oct 2026",
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

describe("formatProportion", () => {
  it("writes the rate as a percentage", () => {
    expect(formatProportion({ count: 47, of: 12623, rate: 0.0037 })).toBe(
      "0.4%",
    );
  });

  it("says not available when there is nothing to count from", () => {
    expect(formatProportion({ count: 0, of: 0, rate: 0 })).toBe(
      "Not available",
    );
  });
});

describe("formatPrice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats tickets as a number with two decimals and no unit", () => {
    expect(formatPrice(238.41, "tix")).toBe("238.41");
    expect(formatPrice(1234.5, "tix")).toBe("1,234.50");
    expect(formatPrice(0, "tix")).toBe("0.00");
  });

  it("formats euros and dollars with their symbol", () => {
    expect(formatPrice(194, "eur")).toBe("€194.00");
    expect(formatPrice(173.64, "usd")).toBe("$173.64");
  });

  it("follows the user's locales", () => {
    vi.stubGlobal("navigator", { ...navigator, languages: ["de-DE"] });

    expect(formatPrice(1234.5, "tix")).toBe("1.234,50");
    expect(formatPrice(194, "eur")).toBe("194,00\u00a0€");
    expect(formatPrice(173.64, "usd")).toBe("173,64\u00a0$");
  });
});
