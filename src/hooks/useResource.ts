import { useCallback, useEffect, useState } from "react";
import { isAbortError } from "../api/client";
import type { TimeWindow } from "../api/types";

export type ResourceState<Data> =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; data: Data }
  | { key: string; status: "error"; error: Error };

/**
 * Loads the data for a time window, and loads it again when the window changes or on retry.
 *
 * A response that arrives after the window changed is dropped, so the state never shows another window's data.
 *
 * @param load - Fetches the data for a window. Its signal aborts when the window changes or the component unmounts.
 * @param timeWindow - The window to load.
 * @returns The state, `loading`, `ready` with its `data`, or `error` with its `error`, and a function that loads the window again.
 */
export function useResource<Data>(
  load: (timeWindow: TimeWindow, signal: AbortSignal) => Promise<Data>,
  timeWindow: TimeWindow,
) {
  const [reloads, setReloads] = useState(0);
  const key = `${timeWindow} ${reloads}`;
  const [state, setState] = useState<ResourceState<Data>>({
    key,
    status: "loading",
  });

  if (state.key !== key) {
    setState({ key, status: "loading" });
  }

  useEffect(() => {
    const controller = new AbortController();
    const settle = (next: ResourceState<Data>) => {
      setState((current) => (current.key === key ? next : current));
    };

    load(timeWindow, controller.signal)
      .then((data) => settle({ key, status: "ready", data }))
      .catch((error: Error) => {
        if (isAbortError(error)) {
          return;
        }
        settle({ key, status: "error", error });
      });

    return () => controller.abort();
  }, [load, timeWindow, key]);

  const retry = useCallback(() => setReloads((count) => count + 1), []);

  return [state, retry] as const;
}
