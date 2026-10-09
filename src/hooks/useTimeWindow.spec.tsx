import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import { useTimeWindow } from "./useTimeWindow";

function renderAt(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );

  return renderHook(
    () => {
      const [timeWindow, select] = useTimeWindow();
      const { pathname, search } = useLocation();

      return {
        timeWindow,
        select,
        address: pathname + search,
        navigationType: useNavigationType(),
      };
    },
    { wrapper },
  );
}

describe("useTimeWindow", () => {
  it("reads the window from the address", () => {
    const { result } = renderAt("/?window=7d");

    expect(result.current.timeWindow).toBe("7d");
  });

  it("falls back to the default when the window is missing or unknown", () => {
    expect(renderAt("/").result.current.timeWindow).toBe("30d");
    expect(renderAt("/?window=90d").result.current.timeWindow).toBe("30d");
  });

  it("selects another window with a new history entry, on the same page", () => {
    const { result } = renderAt("/decks/affinity-e93f5f74?window=30d");

    act(() => result.current.select("7d"));

    expect(result.current.timeWindow).toBe("7d");
    expect(result.current.address).toBe("/decks/affinity-e93f5f74?window=7d");
    expect(result.current.navigationType).toBe("PUSH");
  });

  it("keeps the other query parameters", () => {
    const { result } = renderAt("/?window=30d&deck=affinity");

    act(() => result.current.select("7d"));

    expect(result.current.address).toBe("/?window=7d&deck=affinity");
  });

  it("replaces the history entry when asked", () => {
    const { result } = renderAt("/?window=30d");

    act(() => result.current.select("season", true));

    expect(result.current.address).toBe("/?window=season");
    expect(result.current.navigationType).toBe("REPLACE");
  });

  it("does not navigate when the window is already selected", () => {
    const { result } = renderAt("/?window=30d");

    act(() => result.current.select("30d"));

    expect(result.current.navigationType).toBe("POP");
  });
});
