import { vi } from "vitest";

/**
 * Gives jsdom a `matchMedia` that answers `(prefers-color-scheme: dark)` for a device set to the given scheme. Restore it with `vi.unstubAllGlobals`.
 *
 * @param dark - Whether the device is set to dark.
 * @returns A function that changes the device's setting and tells every listener, as a change in the system settings does.
 */
export function stubColourScheme(dark: boolean): (next: boolean) => void {
  let current = dark;
  const listeners = new Set<() => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" && current,
      media: query,
      addEventListener: (_type: string, listener: () => void): void => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void): void => {
        listeners.delete(listener);
      },
    })),
  );

  return (next): void => {
    current = next;
    listeners.forEach((listener) => listener());
  };
}
