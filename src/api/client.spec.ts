import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getJson, isRetryable } from "./client";

function stubFetch(response: () => Promise<Response>): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(response);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function request(): Promise<{ ok: boolean }> {
  return getJson<{ ok: boolean }>(
    "Pauper/decks",
    { window: "7d" },
    new AbortController().signal,
  );
}

describe("getJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the endpoint through the proxy and parses the body", async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(Response.json({ ok: true })),
    );

    expect(await request()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/decks?window=7d",
    );
  });

  it.each([
    [429, "rateLimit", "Endstep's rate limit was reached."],
    [502, "upstream", "Endstep did not respond."],
    [404, "http", "The request failed with status 404."],
  ])(
    "turns a %i into an error of kind %s, in one request",
    async (status, kind, message) => {
      const fetchMock = stubFetch(() =>
        Promise.resolve(Response.json({}, { status })),
      );

      const error = await request().catch((caught: ApiError) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ kind, status });
      expect((error as ApiError).message).toContain(message);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("reports a request that never reached the server", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(request()).rejects.toMatchObject({
      kind: "network",
      message: "The server could not be reached.",
    });
  });

  it("reports a body that is not JSON", async () => {
    stubFetch(() => Promise.resolve(new Response("<html>")));

    await expect(request()).rejects.toMatchObject({ kind: "malformed" });
  });

  it("passes an abort through unchanged", async () => {
    const controller = new AbortController();
    const abort = new DOMException("Aborted", "AbortError");
    stubFetch(() => {
      controller.abort();
      return Promise.reject(abort);
    });

    await expect(getJson("Pauper/decks", {}, controller.signal)).rejects.toBe(
      abort,
    );
  });
});

describe("isRetryable", () => {
  it.each([
    [new ApiError("down", "network"), true],
    [new ApiError("limit", "rateLimit", 429), true],
    [new ApiError("gateway", "upstream", 502), true],
    [new ApiError("server", "http", 500), true],
    [new ApiError("missing", "http", 404), false],
    [new ApiError("broken", "malformed"), false],
    [new Error("other"), false],
  ])("decides whether %o is worth repeating", (error, expected) => {
    expect(isRetryable(error)).toBe(expected);
  });
});
