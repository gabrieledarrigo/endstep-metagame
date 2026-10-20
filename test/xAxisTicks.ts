/**
 * Reads the labels on a chart's x-axis. Under `sizeCharts`, every word measures as wide as the chart. So Recharts puts each word in its own `tspan`, and this joins the words again.
 *
 * @param container - The element that holds the chart.
 * @returns The label of each tick that Recharts draws, such as `6 Sept`.
 */
export function xAxisTicks(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll(".recharts-xAxis-tick-labels text"),
  ].map((tick) =>
    [...tick.querySelectorAll("tspan")]
      .map((word) => word.textContent)
      .join(" "),
  );
}
