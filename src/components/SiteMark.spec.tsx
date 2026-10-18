import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteMark } from "./SiteMark";

describe("SiteMark", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<SiteMark />);

    expect(
      container.querySelector(".site-mark")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("draws a square tile and three bars, longest first, at 20px", () => {
    const { container } = render(<SiteMark />);
    const mark = container.querySelector(".site-mark");
    const bars = [...container.querySelectorAll(".site-mark__bar")];

    expect(mark?.getAttribute("width")).toBe("20");
    expect(mark?.getAttribute("height")).toBe("20");
    expect(mark?.getAttribute("viewBox")).toBe("0 0 64 64");
    expect(container.querySelectorAll(".site-mark__tile")).toHaveLength(1);
    expect(bars.map((bar) => bar.getAttribute("width"))).toEqual([
      "36",
      "26",
      "16",
    ]);
  });
});
