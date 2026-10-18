import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads whether a media query matches, and follows it as the window changes.
 *
 * @param query - A media query, such as `(min-width: 640px)`.
 * @returns `true` while the query matches.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);

      return (): void => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
  );
}
