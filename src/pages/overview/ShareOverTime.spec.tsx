import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import series from "../../../test/fixtures/share-series.json";
import { sizeCharts } from "../../../test/sizeCharts";
import type { ShareSeries } from "../../api/types";
import { ShareOverTime, ShareOverTimeSkeleton } from "./ShareOverTime";

function Address() {
  const { search } = useLocation();

  return (
    <p>
      Address: {search} by {useNavigationType()}
    </p>
  );
}

function renderAt(path: string): HTMLElement {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShareOverTime series={series.series as ShareSeries[]} />
      <Address />
    </MemoryRouter>,
  ).container;
}

function endLabels(container: HTMLElement): Element[] {
  return [...container.querySelectorAll(".share-chart__end")];
}

afterEach(() => {
  vi.restoreAllMocks();
});

function pressed(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("ShareOverTime", () => {
  it("shows every series when the address hides none", () => {
    renderAt("/?window=30d");

    expect(pressed("Affinity")).toBe("true");
    expect(pressed("Mono Red Madness")).toBe("true");
  });

  it("reads the hidden series from the address", () => {
    renderAt("/?window=30d&hide=affinity-e93f5f74");

    expect(pressed("Affinity")).toBe("false");
    expect(pressed("Mono Red Madness")).toBe("true");
  });

  it("writes each toggle into the address, replacing the history entry", () => {
    renderAt("/?window=30d&hide=affinity-e93f5f74");

    fireEvent.click(screen.getByRole("button", { name: "Mono Red Madness" }));

    expect(
      screen.getByText(
        "Address: ?window=30d&hide=affinity-e93f5f74&hide=mono-red-madness-60596e8a by REPLACE",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Affinity" }));

    expect(
      screen.getByText(
        "Address: ?window=30d&hide=mono-red-madness-60596e8a by REPLACE",
      ),
    ).toBeTruthy();
    expect(pressed("Affinity")).toBe("true");
  });

  it("draws a line and an end label for each shown series, kept apart", () => {
    sizeCharts();

    const container = renderAt("/?window=30d");

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(2);
    const labels = endLabels(container);
    expect(labels.map((label) => label.textContent)).toEqual([
      "Mono Red Madness",
      "Affinity",
    ]);
    const [upper, lower] = labels.map((label) =>
      Number(label.getAttribute("y")),
    );
    expect(lower - upper).toBeGreaterThanOrEqual(16);
  });

  it("leaves a hidden series out of the chart but keeps it in the legend", () => {
    sizeCharts();

    const container = renderAt("/?window=30d&hide=affinity-e93f5f74");

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    expect(endLabels(container).map((label) => label.textContent)).toEqual([
      "Mono Red Madness",
    ]);
    expect(screen.getByRole("button", { name: "Affinity" })).toBeTruthy();
  });

  it("shows the day and each series' share in the tooltip, highest first", () => {
    sizeCharts();
    const container = renderAt("/?window=30d");

    const chart = container.querySelector(".recharts-surface") as Element;
    fireEvent.focus(chart);
    for (let day = 0; day < 29; day += 1) {
      fireEvent.keyDown(chart, { key: "ArrowRight" });
    }

    expect(container.querySelector(".chart-tooltip")?.textContent).toBe(
      "5 October 2026Mono Red Madness6.82%Affinity6.65%",
    );
  });

  it("draws nothing without series", () => {
    const { container } = render(
      <MemoryRouter>
        <ShareOverTime series={[]} />
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("ShareOverTimeSkeleton", () => {
  it("keeps the heading and marks the section as busy", () => {
    const { container } = render(<ShareOverTimeSkeleton />);

    expect(
      screen.getByRole("heading", { name: "Share over time" }),
    ).toBeTruthy();
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
