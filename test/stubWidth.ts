import { vi } from "vitest";

/**
 * Gives jsdom a `matchMedia` that answers `(min-width: Npx)` queries for a window of the given width, and `(hover: hover)` for a device that can hover. Restore it with `vi.unstubAllGlobals`.
 *
 * @param width - The window's width in pixels.
 * @param options - `hover: true` for a device that can hover. Without it, the device cannot.
 * @returns A function that changes the width and tells every listener, as a resize across a breakpoint does.
 */
export function stubWidth(
  width: number,
  options: { hover?: boolean } = {},
): (next: number) => void {
  let current = width;
  const listeners = new Set<() => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const min = /\(min-width: (\d+)px\)/.exec(query);

      return {
        matches:
          (min !== null && current >= Number(min[1])) ||
          (query === "(hover: hover)" && options.hover === true),
        media: query,
        addEventListener: (_type: string, listener: () => void): void => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void): void => {
          listeners.delete(listener);
        },
      };
    }),
  );

  return (next): void => {
    current = next;
    listeners.forEach((listener) => listener());
  };
}
