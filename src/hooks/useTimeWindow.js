import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WINDOW, WINDOWS } from "../config";

function readTimeWindow() {
  const value = new URLSearchParams(location.search).get("window");
  return WINDOWS.includes(value) ? value : DEFAULT_WINDOW;
}

function timeWindowUrl(value) {
  const url = new URL(location.href);
  url.searchParams.set("window", value);
  return url;
}

export function useTimeWindow() {
  const [value, setValue] = useState(readTimeWindow);

  useEffect(() => {
    history.replaceState(null, "", timeWindowUrl(readTimeWindow()));

    const sync = () => setValue(readTimeWindow());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const select = useCallback(
    (next, replace) => {
      if (next === value) {
        return;
      }

      const write = replace ? history.replaceState : history.pushState;
      write.call(history, null, "", timeWindowUrl(next));
      setValue(next);
    },
    [value],
  );

  return [value, select];
}
