import { vi } from "vitest";

/**
 * Gives jsdom a `matchMedia` that answers `(hover: hover)` for a device that can or cannot hover. Every other query does not match. Restore it with `vi.unstubAllGlobals`.
 *
 * @param hover - Whether the device can hover.
 */
export function stubHover(hover: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(hover: hover)" && hover,
      media: query,
      addEventListener: (): void => {},
      removeEventListener: (): void => {},
    })),
  );
}
