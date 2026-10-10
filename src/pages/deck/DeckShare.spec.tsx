import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import { sizeCharts } from "../../../test/sizeCharts";
import type { DeckDetail, SharePoint } from "../../api/types";
import { DeckShare } from "./DeckShare";

const POINTS = (detail as DeckDetail).shareSeries.points;

function renderShare(points: SharePoint[] = POINTS): HTMLElement {
  return render(
    <DeckShare name="Affinity" dates="11 Sep to 10 Oct 2026" points={points} />,
  ).container;
}

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DeckShare", () => {
  it("draws one line, labelled with the last day's share", () => {
    const container = renderShare();

    expect(
      screen.getByRole("region", {
        name: "Daily meta share of Affinity, 11 Sep to 10 Oct 2026",
      }),
    ).toBeTruthy();
    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    expect(container.querySelector(".deck-share__end")?.textContent).toBe(
      "7.37%",
    );
  });

  it("shows the day and the share in the tooltip", () => {
    const container = renderShare();
    const chart = container.querySelector(".recharts-surface") as Element;

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "ArrowLeft" });

    expect(container.querySelector(".chart-tooltip")?.textContent).toBe(
      "11 September 2026Meta share10.29%",
    );
  });

  it("lists every day in a table, with no data for a day without a share", () => {
    renderShare([
      {
        day: "2026-09-04",
        registrations: 0,
        totalRegistrations: 0,
        rate: null,
      },
      ...POINTS.slice(0, 2),
    ]);

    fireEvent.click(screen.getByText("Daily share as a table"));
    const rows = within(screen.getByRole("table")).getAllByRole("row");

    expect(rows.map((row) => row.textContent)).toEqual([
      "DayMeta share",
      "4 Sepno data",
      "11 Sep10.29%",
      "12 Sep10.82%",
    ]);
  });
});
