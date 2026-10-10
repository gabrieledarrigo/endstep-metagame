import { vi } from "vitest";

/**
 * Gives every element a size in jsdom, which lays nothing out, so Recharts' `ResponsiveContainer` draws its chart. Restore it with `vi.restoreAllMocks`.
 *
 * @param width - The width every element reports.
 * @param height - The height every element reports.
 */
export function sizeCharts(width = 800, height = 400): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ width, height }),
  );
}
