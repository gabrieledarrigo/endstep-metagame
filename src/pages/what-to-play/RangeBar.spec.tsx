import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RangeBar } from "./RangeBar";

function parts(container: HTMLElement): Record<string, string> {
  const bar = container.firstElementChild as HTMLElement;

  return Object.fromEntries(
    Array.from(bar.children).map((child) => [
      child.className,
      (child as HTMLElement).style.cssText,
    ]),
  );
}

describe("RangeBar", () => {
  it("draws the range, the 50% line and the rate on the shared scale, hidden from assistive technology", () => {
    const { container } = render(
      <RangeBar
        low={0.5633}
        high={0.5866}
        rate={0.575}
        min={0.35}
        max={0.6}
        verdict="win"
        className="expected__bar"
      />,
    );

    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toBe("range-bar expected__bar");
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(parts(container)).toEqual({
      "range-bar__mid": "left: 60%;",
      "range-bar__span range-bar__span--win": "left: 85.32%; width: 9.32%;",
      "range-bar__dot": "left: 90%;",
    });
  });

  it("marks a range clearly below 50% as a loss", () => {
    const { container } = render(
      <RangeBar
        low={0.4}
        high={0.45}
        rate={0.425}
        min={0.4}
        max={0.5}
        verdict="loss"
      />,
    );

    expect(Object.keys(parts(container))).toContain(
      "range-bar__span range-bar__span--loss",
    );
  });

  it("leaves a range too close to call without a modifier", () => {
    const { container } = render(
      <RangeBar
        low={0.48}
        high={0.53}
        rate={0.505}
        min={0.45}
        max={0.55}
        verdict="neutral"
      />,
    );

    expect(parts(container)).toEqual({
      "range-bar__mid": "left: 50%;",
      "range-bar__span": "left: 30%; width: 50%;",
      "range-bar__dot": "left: 55%;",
    });
  });
});
