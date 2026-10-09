import { useCallback } from "react";
import { useSearchParams } from "react-router";
import type { TimeWindow } from "../api/types";
import { DEFAULT_WINDOW, WINDOWS } from "../config";

/**
 * Reads the time window from the `window` query parameter, which every page shares.
 *
 * @returns The selected window, which is the default when the parameter is missing or unknown, and a function that selects another one. The function pushes a history entry, or replaces the current one when its second argument is `true`.
 */
export function useTimeWindow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value =
    WINDOWS.find((preset) => preset === searchParams.get("window")) ??
    DEFAULT_WINDOW;

  const select = useCallback(
    (next: TimeWindow, replace?: boolean) => {
      if (next === value) {
        return;
      }

      setSearchParams({ window: next }, { replace });
    },
    [value, setSearchParams],
  );

  return [value, select] as const;
}
