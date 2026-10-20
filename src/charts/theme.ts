import { formatDay } from "../helpers";

const CHART_GRID = "var(--rule)";
export const CHART_BASELINE = "var(--baseline)";
export const CHART_TICK = "var(--text-400)";
export const CHART_SURFACE = "var(--surface)";

export const CHART_AXIS = {
  tickLine: false,
  tick: {
    fill: CHART_TICK,
    fontSize: 12,
    style: { fontVariantNumeric: "tabular-nums" },
  },
  axisLine: { stroke: CHART_BASELINE },
};

export const CHART_DAY_AXIS = {
  ...CHART_AXIS,
  dataKey: "day",
  tickFormatter: formatDay,
  minTickGap: 24,
};

export const CHART_CARTESIAN_GRID = { stroke: CHART_GRID, vertical: false };
