import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartLegend, ChartLegendSkeleton } from "./ChartLegend";

const ITEMS = [
  { key: "affinity", name: "Affinity", colour: "#1c5cab" },
  { key: "madness", name: "Mono Red Madness", colour: "#c0392b" },
];

describe("ChartLegend", () => {
  it("shows a toggle for each series, pressed unless the series is hidden", () => {
    render(
      <ChartLegend
        items={ITEMS}
        hidden={new Set(["madness"])}
        onToggle={() => {}}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Affinity" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Mono Red Madness" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("reports the toggled series by its key", () => {
    const onToggle = vi.fn<(key: string) => void>();
    render(
      <ChartLegend items={ITEMS} hidden={new Set()} onToggle={onToggle} />,
    );

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
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
