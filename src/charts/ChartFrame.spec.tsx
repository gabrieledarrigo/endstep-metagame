import { render } from "@testing-library/react";
import { Line, LineChart } from "recharts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sizeCharts } from "../../test/sizeCharts";
import { ChartFrame } from "./ChartFrame";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChartFrame", () => {
  it("draws its chart at the size of the frame", () => {
    sizeCharts(640, 320);

    const { container } = render(
      <ChartFrame className="share-chart__frame">
        <LineChart data={[{ share: 1 }, { share: 2 }]}>
          <Line dataKey="share" isAnimationActive={false} />
        </LineChart>
      </ChartFrame>,
    );

    const chart = container.querySelector("svg");
    expect(chart?.getAttribute("width")).toBe("640");
    expect(chart?.getAttribute("height")).toBe("320");
  });
});
