import type { DefaultOptions } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { createQueryClient } from "./queryClient";

type Policy = {
  queries: NonNullable<DefaultOptions["queries"]>;
  retry: (failureCount: number, error: Error) => boolean;
  retryDelay: (failureCount: number, error: Error) => number;
};

function policy(): Policy {
  const queries = createQueryClient().getDefaultOptions().queries ?? {};
  const { retry, retryDelay } = queries;

  if (typeof retry !== "function" || typeof retryDelay !== "function") {
    throw new Error("The retry policy is not a function");
  }

  return { queries, retry, retryDelay };
}

describe("createQueryClient", () => {
  it("keeps a response fresh for five minutes and in memory for the visit, and ignores window focus", () => {
    const { queries } = policy();

    expect(queries.staleTime).toBe(5 * 60 * 1000);
    expect(queries.gcTime).toBe(Infinity);
    expect(queries.refetchOnWindowFocus).toBe(false);
  });

  it("runs requests while the browser reports itself offline, so the network error shows", () => {
    expect(policy().queries.networkMode).toBe("always");
  });

  it("retries a network error, a 429 or a 5xx at most twice", () => {
    const { retry } = policy();
    const rateLimit = new ApiError("limit", "rateLimit", 429);

    expect(retry(0, new ApiError("down", "network"))).toBe(true);
    expect(retry(1, rateLimit)).toBe(true);
    expect(retry(2, rateLimit)).toBe(false);
    expect(retry(0, new ApiError("missing", "http", 404))).toBe(false);
  });

  it("waits 400 ms and then 800 ms between attempts", () => {
    const { retryDelay } = policy();
    const error = new ApiError("limit", "rateLimit", 429);

    expect(retryDelay(0, error)).toBe(400);
    expect(retryDelay(1, error)).toBe(800);
  });
});
