import { useCallback, useEffect, useState } from "react";

const LOADING = { status: "loading" };

export function useResource(load, timeWindow) {
  const [reloads, setReloads] = useState(0);
  const key = `${timeWindow} ${reloads}`;
  const [state, setState] = useState({ key, ...LOADING });

  if (state.key !== key) {
    setState({ key, ...LOADING });
  }

  useEffect(() => {
    const controller = new AbortController();
    const settle = (next) => {
      setState((current) => (current.key === key ? { key, ...next } : current));
    };

    load(timeWindow, controller.signal)
      .then((data) => settle({ status: "ready", data }))
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        settle({ status: "error", error });
      });

    return () => controller.abort();
  }, [load, timeWindow, key]);

  const retry = useCallback(() => setReloads((count) => count + 1), []);

  return [state, retry];
}
