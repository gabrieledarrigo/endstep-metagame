import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartLegend, ChartLegendSkeleton } from "./ChartLegend";

const ITEMS = [
  { key: "affinity", name: "Affinity", colour: "#1c5cab" },
  { key: "madness", name: "Mono Red Madness", colour: "#c0392b" },
];

describe("ChartLegend", () => {
  it("groups the toggles under the name of what they do", () => {
    render(<ChartLegend items={ITEMS} pressed={null} onToggle={() => {}} />);

    expect(
      screen.getByRole("group", { name: "Highlight a deck" }),
    ).toBeTruthy();
  });

  it("presses no toggle when no series is highlighted", () => {
    render(<ChartLegend items={ITEMS} pressed={null} onToggle={() => {}} />);

    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-pressed")),
    ).toEqual(["false", "false"]);
  });

  it("presses the toggle of the highlighted series only", () => {
    render(<ChartLegend items={ITEMS} pressed="madness" onToggle={() => {}} />);

    expect(
      screen
        .getByRole("button", { name: "Affinity" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Mono Red Madness" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("reports the toggled series by its key", () => {
    const onToggle = vi.fn<(key: string) => void>();
    render(<ChartLegend items={ITEMS} pressed={null} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Mono Red Madness" }));

    expect(onToggle).toHaveBeenCalledWith("madness");
  });
});

describe("ChartLegendSkeleton", () => {
  it("draws one hidden placeholder for each width, and nothing a screen reader reads", () => {
    const { container } = render(
      <ChartLegendSkeleton widths={[72, 124, 102]} />,
    );

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(3);
    expect(container.textContent).toBe("");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
