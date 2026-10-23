import { afterEach, describe, expect, it, vi } from "vitest";
import { CallLog, logged, logger, outcomeOf } from "./log.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function request(query = "?window=1d", referer?: string): Request {
  return new Request(`http://localhost/api/anything${query}`, {
    headers: referer ? { referer } : {},
  });
}

describe("CallLog", () => {
  it("counts the calls to each service apart, and the reasons of the failed ones", () => {
    const calls = new CallLog();
    calls.record("endstep", "succeeded");
    calls.record("endstep", "timeout");
    calls.record("endstep", 503);
    calls.record("endstep", "timeout");
    calls.record("endstep", "aborted");
    calls.record("scryfall", "succeeded");

    expect(calls.calls("endstep")).toEqual({
      total: 5,
      succeeded: 1,
      failed: 3,
      aborted: 1,
    });
    expect(calls.failures("endstep")).toEqual({ timeout: 2, 503: 1 });
    expect(calls.calls("scryfall")).toEqual({
      total: 1,
      succeeded: 1,
      failed: 0,
      aborted: 0,
    });
    expect(calls.failures("scryfall")).toEqual({});
  });
});

describe("outcomeOf", () => {
  it.each([
    [
      new DOMException("The operation timed out", "TimeoutError"),
      false,
      "timeout",
    ],
    [
      new DOMException("The operation timed out", "TimeoutError"),
      true,
      "timeout",
    ],
    [
      new DOMException("This operation was aborted", "AbortError"),
      false,
      "aborted",
    ],
    [new TypeError("fetch failed"), false, "network"],
    [new SyntaxError("Unexpected token <"), true, "body"],
    [new TypeError("terminated"), true, "body"],
  ])("reads %s while reading=%s as %s", (error, reading, outcome) => {
    expect(outcomeOf(error, reading)).toBe(outcome);
  });
});

describe("logged", () => {
  it.each([429, 500, 502, 503])(
    "writes one error line for a response with status %i",
    async (status) => {
      const error = vi.spyOn(logger, "error");
      const handler = logged("matchups", async (_req, { calls }) => {
        calls.record("endstep", "timeout");
        return new Response(null, { status });
      });

      await handler(
        request("?window=1d", "http://localhost/matchups?window=1d"),
      );

      expect(error).toHaveBeenCalledOnce();
      expect(error.mock.calls[0]).toEqual([
        {
          page: "/matchups",
          function: "matchups",
          window: "1d",
          status,
          upstream: "endstep",
          calls: { total: 1, succeeded: 0, failed: 1, aborted: 0 },
          failures: { timeout: 1 },
          durationMs: expect.any(Number),
        },
        `matchups 1d: ${status}, 1 of 1 Endstep calls failed (1 timeout)`,
      ]);
    },
  );

  it.each([200, 204, 400, 404, 405])(
    "writes no line for a response with status %i",
    async (status) => {
      const error = vi.spyOn(logger, "error");
      const warn = vi.spyOn(logger, "warn");
      const handler = logged(
        "matchups",
        async () => new Response(null, { status }),
      );

      await handler(request());

      expect(error).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it("names no service when the failed response made no failed call", async () => {
    const error = vi.spyOn(logger, "error");
    const handler = logged(
      "staples",
      async () => new Response(null, { status: 502 }),
    );

    await handler(request("?window=30d&section=main"));

    expect(error.mock.calls[0]).toEqual([
      expect.objectContaining({
        page: null,
        upstream: null,
        calls: null,
        failures: null,
      }),
      "staples 30d: 502",
    ]);
  });

  it("adds the aborted calls to the summary only when there are any", async () => {
    const error = vi.spyOn(logger, "error");
    const handler = logged("staples", async (_req, { calls }) => {
      calls.record("endstep", "succeeded");
      calls.record("endstep", 429);
      calls.record("endstep", "aborted");
      calls.record("endstep", "aborted");
      return new Response(null, { status: 429 });
    });

    await handler(request("?window=30d"));

    expect(error.mock.calls[0][1]).toBe(
      "staples 30d: 429, 1 of 4 Endstep calls failed (1 429), 2 aborted",
    );
  });

  it("writes one warn line when the handler falls back, and no error line", async () => {
    const error = vi.spyOn(logger, "error");
    const warn = vi.spyOn(logger, "warn");
    const handler = logged(
      "deck-page",
      async (_req, { calls, fellBack }) => {
        calls.record("endstep", "network");
        fellBack();
        return new Response("<html>", { status: 200 });
      },
      () => ({ page: "/decks/elves", subject: "elves" }),
    );

    await handler(request("?slug=elves"));

    expect(error).not.toHaveBeenCalled();
    expect(warn.mock.calls[0]).toEqual([
      expect.objectContaining({
        page: "/decks/elves",
        status: 200,
        upstream: "endstep",
        failures: { network: 1 },
      }),
      "deck-page elves: fell back to the site card, 1 of 1 Endstep calls failed (1 network)",
    ]);
  });

  it("answers 500 for a handler that throws, and writes one error line with the error's message", async () => {
    const error = vi.spyOn(logger, "error");
    const handler = logged("sample-cards", async () => {
      throw new Error("Cannot read properties of undefined");
    });

    const response = await handler(request("?deck=elves&window=7d"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "The function failed" });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]).toEqual([
      {
        page: null,
        function: "sample-cards",
        window: "7d",
        status: 500,
        upstream: null,
        calls: null,
        failures: null,
        durationMs: expect.any(Number),
        error: "Cannot read properties of undefined",
      },
      "sample-cards 7d: 500, the function failed (Cannot read properties of undefined)",
    ]);
  });

  it("names no page for a Referer that is not an address", async () => {
    const error = vi.spyOn(logger, "error");
    const handler = logged(
      "matchups",
      async () => new Response(null, { status: 502 }),
    );

    await handler(request("?window=1d", "not an address"));

    expect(error.mock.calls[0][0]).toMatchObject({ page: null });
  });
});

describe("logger", () => {
  it("takes its level from LOG_LEVEL, which the specs set to silent", () => {
    expect(logger.level).toBe("silent");
  });
});
