import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import { createQueryClient } from "../api/queryClient";
import { useMatchups } from "./useMatchups";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMatchups", () => {
  it("reads the window's matrix once for every caller", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(matrix));
    vi.stubGlobal("fetch", fetchMock);
    const client = createQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => [useMatchups("30d"), useMatchups("30d")],
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current[0].data?.decks).toHaveLength(4);
    });
    expect(result.current[1].data).toBe(result.current[0].data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/matchups?window=30d");
  });

  it("does not retry a failed build", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "x" }, { status: 502 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMatchups("7d"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
