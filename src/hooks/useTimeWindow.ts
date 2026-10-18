import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { TimeWindow } from "../api/types";
import { DEFAULT_WINDOW, WINDOWS } from "../config";
import { readableSearch } from "../helpers";

/**
 * Reads the time window from the `window` query parameter, which every page shares.
 *
 * @returns The selected window, which is the default when the parameter is missing or unknown, and a function that selects another one. The function pushes a history entry, or replaces the current one when its second argument is `true`. It keeps the other parameters, with colons and commas readable.
 */
export function useTimeWindow(): readonly [
  TimeWindow,
  (next: TimeWindow, replace?: boolean) => void,
] {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const value =
    WINDOWS.find((preset) => preset === searchParams.get("window")) ??
    DEFAULT_WINDOW;

  const select = useCallback(
    (next: TimeWindow, replace?: boolean) => {
      if (next === value) {
        return;
      }

      const params = new URLSearchParams(searchParams);
      params.set("window", next);
      navigate({ search: `?${readableSearch(params)}` }, { replace });
    },
    [value, searchParams, navigate],
  );

  return [value, select] as const;
}
