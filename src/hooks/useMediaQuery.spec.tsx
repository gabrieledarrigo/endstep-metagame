import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubWidth } from "../../test/stubWidth";
import { useMediaQuery } from "./useMediaQuery";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it("says whether the query matches the window", () => {
    stubWidth(1100);

    expect(
      renderHook(() => useMediaQuery("(min-width: 1100px)")).result.current,
    ).toBe(true);
    expect(
      renderHook(() => useMediaQuery("(min-width: 1280px)")).result.current,
    ).toBe(false);
  });

  it("follows the window across the breakpoint", () => {
    const resize = stubWidth(1280);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1100px)"));

    act(() => resize(1099));

    expect(result.current).toBe(false);

    act(() => resize(1100));

    expect(result.current).toBe(true);
  });

  it("follows a new query", () => {
    stubWidth(800);
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: "(min-width: 640px)" } },
    );

    expect(result.current).toBe(true);

    rerender({ query: "(min-width: 1100px)" });

    expect(result.current).toBe(false);
  });
});
