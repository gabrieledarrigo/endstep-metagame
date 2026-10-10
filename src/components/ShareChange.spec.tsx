import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Deck } from "../api/types";
import { ShareChange } from "./ShareChange";

function change(
  points: number | null,
  reason: Deck["shareChange"]["reason"] = null,
): Deck["shareChange"] {
  return { points, previousRate: null, reason };
}

describe("ShareChange", () => {
  it("shows a rise with an up arrow and two decimals", () => {
    const { container } = render(<ShareChange change={change(3.78617)} />);

    expect(screen.getByRole("img", { name: "up" })).toBeTruthy();
    expect(container.textContent).toBe("\u25b2 3.79 pts");
  });

  it("shows a fall with a down arrow and the size of the change", () => {
    const { container } = render(<ShareChange change={change(-2.4973)} />);

    expect(screen.getByRole("img", { name: "down" })).toBeTruthy();
    expect(container.textContent).toBe("\u25bc 2.50 pts");
  });

  it("shows a change too small for two decimals as under 0.01", () => {
    const { container } = render(<ShareChange change={change(0.004)} />);

    expect(container.textContent).toBe("\u25b2 <0.01 pts");
  });

  it("says when there is no change", () => {
    render(<ShareChange change={change(0)} />);

    expect(screen.getByText("no change")).toBeTruthy();
  });

  it.each([
    ["previous_window_empty", "no earlier data"],
    ["no_previous_window", "no earlier window"],
    [null, "not available"],
  ] as const)("explains a missing change with reason %s", (reason, text) => {
    render(<ShareChange change={change(null, reason)} />);

    expect(screen.getByText(text)).toBeTruthy();
  });
});
