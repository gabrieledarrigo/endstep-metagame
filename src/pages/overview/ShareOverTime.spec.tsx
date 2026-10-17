import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const AFFINITY = "affinity-e93f5f74";
const MADNESS = "mono-red-madness-60596e8a";

function curve(container: HTMLElement, name: string): Element {
  return container.querySelector(
    `.recharts-line-curve[name="${name}"]`,
  ) as Element;
}

async function drawn(container: HTMLElement, name: string): Promise<Element> {
  await waitFor(() => {
    expect(curve(container, name)).toBeTruthy();
  });

  return curve(container, name);
}

function end(container: HTMLElement, name: string): Element {
  return endLabels(container).find((label) => label.textContent === name)
    ?.parentElement as Element;
}

function hoverFirstDay(container: HTMLElement): void {
  const chart = container.querySelector(".recharts-surface") as Element;
  fireEvent.focus(chart);
  fireEvent.keyDown(chart, { key: "ArrowRight" });
}

function activeDot(container: HTMLElement, name: string): Element {
  const colour = curve(container, name).getAttribute("stroke");

  return container.querySelector(
    `.recharts-active-dot circle[fill="${colour}"]`,
  ) as Element;
}

describe("ShareOverTime", () => {
  it("highlights no deck when the address names none", () => {
    sizeCharts();

    const container = renderAt("/?window=30d");

    expect(pressed("Affinity")).toBe("false");
    expect(pressed("Mono Red Madness")).toBe("false");
    expect(container.querySelector('[stroke-opacity="var(--line-fade)"]')).toBe(
      null,
    );
    expect(container.querySelector('[opacity="var(--line-fade)"]')).toBe(null);
  });

  it("reads the highlighted deck from the address", () => {
    renderAt(`/?window=30d&highlight=${AFFINITY}`);

    expect(pressed("Affinity")).toBe("true");
    expect(pressed("Mono Red Madness")).toBe("false");
  });

  it("highlights on a click, clears on a second click, and moves on a click on another deck, replacing the history entry", () => {
    renderAt("/?window=30d");

    fireEvent.click(screen.getByRole("button", { name: "Affinity" }));

    expect(
      screen.getByText(`Address: ?window=30d&highlight=${AFFINITY} by REPLACE`),
    ).toBeTruthy();
    expect(pressed("Affinity")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Mono Red Madness" }));

    expect(
      screen.getByText(`Address: ?window=30d&highlight=${MADNESS} by REPLACE`),
    ).toBeTruthy();
    expect(pressed("Affinity")).toBe("false");
    expect(pressed("Mono Red Madness")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Mono Red Madness" }));

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
    expect(pressed("Mono Red Madness")).toBe("false");
  });

  it("shows no highlight for a deck that is not in the chart", () => {
    sizeCharts();

    const container = renderAt("/?window=30d&highlight=elves-0a1b2c3d");

    expect(pressed("Affinity")).toBe("false");
    expect(pressed("Mono Red Madness")).toBe("false");
    expect(container.querySelector('[stroke-opacity="var(--line-fade)"]')).toBe(
      null,
    );
  });

  it("draws the highlighted line at 3px in a layer above the other lines", async () => {
    sizeCharts();

    const container = renderAt(`/?window=30d&highlight=${AFFINITY}`);

    const highlighted = await drawn(container, "Affinity");
    const other = curve(container, "Mono Red Madness");
    expect(highlighted.getAttribute("stroke-width")).toBe("3");
    expect(other.getAttribute("stroke-width")).toBe("2");
    expect(highlighted.closest(".recharts-zIndex-layer_401")).toBeTruthy();
    expect(other.closest(".recharts-zIndex-layer_400")).toBeTruthy();
    expect(
      other.compareDocumentPosition(highlighted) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("fades every other line, its end dot and its end label, and leaves the highlighted deck at full strength", async () => {
    sizeCharts();

    const container = renderAt(`/?window=30d&highlight=${AFFINITY}`);
    await drawn(container, "Affinity");

    expect(
      curve(container, "Mono Red Madness").getAttribute("stroke-opacity"),
    ).toBe("var(--line-fade)");
    expect(end(container, "Mono Red Madness").getAttribute("opacity")).toBe(
      "var(--line-fade)",
    );
    expect(curve(container, "Affinity").hasAttribute("stroke-opacity")).toBe(
      false,
    );
    expect(end(container, "Affinity").hasAttribute("opacity")).toBe(false);
  });

  it("fades the other lines' hover dots, and not the highlighted deck's", async () => {
    sizeCharts();
    const container = renderAt(`/?window=30d&highlight=${AFFINITY}`);
    await drawn(container, "Affinity");

    hoverFirstDay(container);

    expect(
      activeDot(container, "Mono Red Madness").getAttribute("opacity"),
    ).toBe("var(--line-fade)");
    expect(activeDot(container, "Affinity").hasAttribute("opacity")).toBe(
      false,
    );
  });

  it("draws every line whatever the address says about hiding", () => {
    sizeCharts();

    const container = renderAt(`/?window=30d&hide=${AFFINITY}`);

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(2);
    expect(endLabels(container)).toHaveLength(2);
  });

  it("draws a line and an end label for each series, kept apart", () => {
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

  it("draws each series in one of the theme's series colours, so a change of theme recolours it", () => {
    sizeCharts();

    const container = renderAt("/?window=30d");

    const strokes = [...container.querySelectorAll(".recharts-line-curve")].map(
      (line) => line.getAttribute("stroke"),
    );
    expect(strokes).toHaveLength(2);
    strokes.forEach((stroke) => {
      expect(stroke).toMatch(/^var\(--s[1-8]\)$/);
    });
  });

  it("shows the day and each series' share in the tooltip, highest first", () => {
    sizeCharts();
    const container = renderAt("/?window=30d");

    const chart = container.querySelector(".recharts-surface") as Element;
    fireEvent.focus(chart);
    for (let day = 1; day < series.series[0].points.length; day += 1) {
      fireEvent.keyDown(chart, { key: "ArrowRight" });
    }

    expect(container.querySelector(".chart-tooltip")?.textContent).toBe(
      "05 October 2026Mono Red Madness6.82%Affinity6.65%",
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
