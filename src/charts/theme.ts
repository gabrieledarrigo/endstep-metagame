const rootTokens = getComputedStyle(document.documentElement);

/**
 * Reads a design token from the root element, for chart props that cannot take a CSS variable.
 *
 * @param name - The custom property, such as `--s1`.
 * @returns The token's value, or an empty string when the property is not set.
 */
export function token(name: string) {
  return rootTokens.getPropertyValue(name).trim();
}

const CHART_GRID = token("--rule");
export const CHART_BASELINE = token("--baseline");
export const CHART_TICK = token("--text-400");
export const CHART_SURFACE = token("--surface");

export const CHART_AXIS = {
  tickLine: false,
  tick: {
    fill: CHART_TICK,
    fontSize: 12,
    style: { fontVariantNumeric: "tabular-nums" },
  },
  axisLine: { stroke: CHART_BASELINE },
};

export const CHART_CARTESIAN_GRID = { stroke: CHART_GRID, vertical: false };
