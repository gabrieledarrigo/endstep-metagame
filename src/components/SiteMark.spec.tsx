import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteMark } from "./SiteMark";

function drawMark(): SVGSVGElement {
  const { container } = render(<SiteMark />);
  const mark = container.querySelector("svg");
  if (!mark) {
    throw new Error("No mark was drawn");
  }

  return mark;
}

describe("SiteMark", () => {
  it("is hidden from assistive technology", () => {
    expect(drawMark().getAttribute("aria-hidden")).toBe("true");
  });

  it("adds a parent's class beside its own", () => {
    const { container } = render(<SiteMark className="site-header__mark" />);

    expect(container.querySelector("svg")?.getAttribute("class")).toBe(
      "site-mark site-header__mark",
    );
    expect(drawMark().getAttribute("class")).toBe("site-mark");
  });

  it("draws at 20px on a 64-unit grid", () => {
    const mark = drawMark();

    expect(mark.getAttribute("width")).toBe("20");
    expect(mark.getAttribute("height")).toBe("20");
    expect(mark.getAttribute("viewBox")).toBe("0 0 64 64");
  });

  it("paints the rounded tile first, under the bars", () => {
    const tile = drawMark().firstElementChild;

    expect(tile?.getAttribute("class")).toBe("site-mark__tile");
    expect(tile?.getAttribute("width")).toBe("64");
    expect(tile?.getAttribute("height")).toBe("64");
    expect(tile?.getAttribute("rx")).toBe("10");
  });

  it("draws three bars after the tile, top to bottom, longest first", () => {
    const bars = [...drawMark().children].slice(1);

    expect(
      bars.map((bar) => ({
        bar: bar.classList.contains("site-mark__bar"),
        y: bar.getAttribute("y"),
        width: bar.getAttribute("width"),
        rx: bar.getAttribute("rx"),
      })),
    ).toEqual([
      { bar: true, y: "14.5", width: "36", rx: "2" },
      { bar: true, y: "27.5", width: "26", rx: "2" },
      { bar: true, y: "40.5", width: "16", rx: "2" },
    ]);
  });
});
