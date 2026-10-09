import { useCallback, useEffect, useState } from "react";
import type { TimeWindow } from "../api/types";
import { DEFAULT_WINDOW, WINDOWS } from "../config";

function readTimeWindow() {
  const value = new URLSearchParams(location.search).get("window");
  return WINDOWS.find((preset) => preset === value) ?? DEFAULT_WINDOW;
}

function timeWindowUrl(value: TimeWindow) {
  const url = new URL(location.href);
  url.searchParams.set("window", value);
  return url;
}

/**
 * Keeps the selected time window in the `window` query parameter.
 *
 * On mount it writes the window it read back to the address, so a missing or unknown value becomes the default. Back and forward restore the window from the address.
 *
 * @returns The selected window, and a function that selects another one. The function pushes a history entry, or replaces the current one when its second argument is `true`.
 */
export function useTimeWindow() {
  const [value, setValue] = useState(readTimeWindow);

  useEffect(() => {
    history.replaceState(null, "", timeWindowUrl(readTimeWindow()));

    const sync = () => setValue(readTimeWindow());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const select = useCallback(
    (next: TimeWindow, replace?: boolean) => {
      if (next === value) {
        return;
      }

      const write = replace ? history.replaceState : history.pushState;
      write.call(history, null, "", timeWindowUrl(next));
      setValue(next);
    },
    [value],
  );

  return [value, select] as const;
}
