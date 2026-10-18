import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import sampleCards from "../../test/fixtures/sample-cards.json";
import { createQueryClient } from "../api/queryClient";
import type { TimeWindow } from "../api/types";
import { useSampleCards } from "./useSampleCards";

function wrapper(): {
  client: QueryClient;
  Wrapper: (props: { children: ReactNode }) => ReactNode;
} {
  const client = createQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, Wrapper };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSampleCards", () => {
  it("reads the list's cards under the deck and the window", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(sampleCards),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { client, Wrapper } = wrapper();

    const { result } = renderHook(
      () => useSampleCards("affinity-e93f5f74", "30d", true),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.cards["Galvanic Blast"].tix).toBe(0.23);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/sample-cards?deck=affinity-e93f5f74&window=30d",
    );
    expect(
      client.getQueryData(["sample-cards", "affinity-e93f5f74", "30d"]),
    ).toBe(result.current.data);
  });

  it("does not retry a failed request", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "x" }, { status: 502 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = wrapper();

    const { result } = renderHook(
      () => useSampleCards("affinity-e93f5f74", "30d", true),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("makes no request while disabled", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(sampleCards),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = wrapper();

    const { result } = renderHook(
      () => useSampleCards("affinity-e93f5f74", "30d", false),
      { wrapper: Wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("keeps the same deck's previous cards as placeholder data while another window loads", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("window=7d")
        ? new Promise<Response>(() => {})
        : Response.json(sampleCards),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = wrapper();

    const { result, rerender } = renderHook(
      ({ slug, timeWindow }: { slug: string; timeWindow: TimeWindow }) =>
        useSampleCards(slug, timeWindow, true),
      {
        wrapper: Wrapper,
        initialProps: { slug: "affinity-e93f5f74", timeWindow: "30d" },
      },
    );
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    rerender({ slug: "affinity-e93f5f74", timeWindow: "7d" });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.cards["Galvanic Blast"].tix).toBe(0.23);

    rerender({ slug: "dimir-control-1234abcd", timeWindow: "7d" });

    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
