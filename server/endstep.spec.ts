import { afterEach, describe, expect, it, vi } from "vitest";
import { CallLog } from "./log.js";
import {
  deckDetailUrl,
  isNetworkError,
  isRateLimit,
  upstream,
} from "./endstep.js";

describe("deckDetailUrl", () => {
  it("builds the deck page's own address on the proxy, window first and then the population", () => {
    expect(
      deckDetailUrl("https://example.vercel.app", "affinity-e93f5f74", "30d"),
    ).toBe(
      "https://example.vercel.app/api/metagame/Pauper/decks/affinity-e93f5f74?window=30d&population=rated",
    );
  });

  it("encodes the slug", () => {
    expect(deckDetailUrl("http://127.0.0.1:4201", "a b", "season")).toBe(
      "http://127.0.0.1:4201/api/metagame/Pauper/decks/a%20b?window=season&population=rated",
    );
  });
});

describe("upstream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks Endstep for the path with the parameters in order, with the 8 second timeout, and parses the body", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");

    const body = await upstream("Pauper/decks", { window: "30d", page: "2" });

    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://endstep.cc/api/metagame/v1/Pauper/decks?window=30d&page=2",
      {
        headers: { accept: "application/json" },
        signal: expect.any(AbortSignal),
      },
    );
    expect(timeout.mock.calls).toEqual([[8000]]);
  });

  it.each([429, 500])(
    "cancels the body of a %i, so the connection is freed",
    async (status) => {
      const cancel = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(
          async () => new Response(new ReadableStream({ cancel }), { status }),
        ),
      );

      await upstream("Pauper/decks", {}).catch(() => undefined);

      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it("uses the timeout it is given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => Response.json({ ok: true })),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await upstream("Pauper/decks", {}, { timeoutMs: 20_000 });

    expect(timeout.mock.calls).toEqual([[20_000]]);
  });

  it("sends nothing when its signal is already aborted", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(
      upstream("Pauper/decks", {}, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts the call when its signal aborts", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        (_, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const call = upstream("Pauper/decks", {}, { signal: controller.signal });
    controller.abort();

    await expect(call).rejects.toThrow("Aborted");
  });

  it.each([
    [429, true],
    [500, false],
    [404, false],
  ])(
    "rejects a %i with an error that isRateLimit reads as %s",
    async (status, limited) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async () => new Response(null, { status })),
      );

      const error: unknown = await upstream("Pauper/decks", {}).catch(
        (reason: unknown) => reason,
      );

      expect(error).toBeInstanceOf(Error);
      expect(isRateLimit(error)).toBe(limited);
    },
  );
});

describe("upstream's network failure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a failed fetch with an error that isNetworkError reads, with the fetch error as its cause", async () => {
    const failure = new TypeError("fetch failed");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw failure;
      }),
    );

    const error: unknown = await upstream("Pauper/decks", {}).catch(
      (reason: unknown) => reason,
    );

    expect(isNetworkError(error)).toBe(true);
    expect(error).toMatchObject({ cause: failure });
  });

  it.each([
    [
      "a timeout",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
    [
      "an abort",
      async (): Promise<Response> => {
        throw new DOMException("Aborted", "AbortError");
      },
    ],
    [
      "a 500",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
    [
      "a body that breaks off",
      async (): Promise<Response> =>
        new Response(
          new ReadableStream({
            start(controller): void {
              controller.error(new TypeError("terminated"));
            },
          }),
        ),
    ],
    [
      "a body that is not JSON",
      async (): Promise<Response> => new Response("<html>"),
    ],
  ])("keeps %s apart from a network failure", async (_, answer) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(answer));

    const error: unknown = await upstream("Pauper/decks", {}).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect(isNetworkError(error)).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("reads an error that upstream did not throw as no network failure", () => {
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(false);
  });
});

describe("isRateLimit", () => {
  it("reads any error other than Endstep's own 429 as no rate limit", () => {
    expect(isRateLimit(new Error("429"))).toBe(false);
    expect(isRateLimit({ status: 429 })).toBe(false);
  });
});

describe("upstream's call log", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function outcome(answer: () => Promise<Response>): Promise<CallLog> {
    const calls = new CallLog();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(answer));

    await upstream("Pauper/decks", {}, { calls }).catch(() => undefined);

    return calls;
  }

  it.each([
    [
      "a success",
      async (): Promise<Response> => Response.json({ ok: true }),
      {},
      1,
    ],
    [
      "a 503",
      async (): Promise<Response> => new Response(null, { status: 503 }),
      { 503: 1 },
      0,
    ],
    [
      "a failed fetch",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
      { network: 1 },
      0,
    ],
    [
      "a timeout",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
      { timeout: 1 },
      0,
    ],
    [
      "a body that is not JSON",
      async (): Promise<Response> => new Response("<html>"),
      { body: 1 },
      0,
    ],
  ])("records %s", async (_, answer, failures, succeeded) => {
    const calls = await outcome(answer);

    expect(calls.calls("endstep")).toMatchObject({ total: 1, succeeded });
    expect(calls.failures("endstep")).toEqual(failures);
  });

  it("records a call that its signal stopped before it started as aborted", async () => {
    const calls = new CallLog();
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());

    await upstream(
      "Pauper/decks",
      {},
      { calls, signal: controller.signal },
    ).catch(() => undefined);

    expect(calls.calls("endstep")).toEqual({
      total: 1,
      succeeded: 0,
      failed: 0,
      aborted: 1,
    });
  });
});
