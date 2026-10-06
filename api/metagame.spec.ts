import { afterEach, describe, expect, it, vi } from "vitest";
import metagame from "./metagame";

const UPSTREAM = "https://endstep.cc/api/metagame/v1";

function request(query: string, method = "GET") {
  return new Request(`http://localhost/api/metagame?${query}`, { method });
}

function upstream(status = 200, contentType = "application/json") {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response('{"ok":true}', {
        status,
        headers: { "content-type": contentType },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the metagame proxy", () => {
  it("forwards an allowed path with its allowed parameters only", async () => {
    const fetchMock = upstream();

    const response = await metagame.fetch(
      request("path=Pauper/decks&window=30d&pageSize=24&token=secret"),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      `${UPSTREAM}/Pauper/decks?window=30d&pageSize=24`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reads a path sent in parts or with an encoded slash", async () => {
    const fetchMock = upstream();

    await metagame.fetch(request("path=Pauper&path=share-series"));
    await metagame.fetch(request("path=Pauper%2Fdecks%2Faffinity-e93f5f74"));

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${UPSTREAM}/Pauper/share-series`,
      `${UPSTREAM}/Pauper/decks/affinity-e93f5f74`,
    ]);
  });

  it.each([
    ["a path outside the allow-list", "path=Pauper/admin"],
    ["a segment with dots", "path=..%2Fsecrets"],
    ["a missing path", ""],
  ])("rejects %s without calling Endstep", async (_, query) => {
    const fetchMock = upstream();

    const response = await metagame.fetch(request(query));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers the CORS preflight without calling Endstep", async () => {
    const fetchMock = upstream();

    const response = await metagame.fetch(request("path=formats", "OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, HEAD, OPTIONS",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([204, 304])(
    "passes an empty %i through without a body or a cache lifetime",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async () => new Response(null, { status })),
      );

      const response = await metagame.fetch(request("path=formats"));

      expect(response.status).toBe(status);
      expect(response.body).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );

  it("refuses methods other than GET, HEAD and OPTIONS", async () => {
    const fetchMock = upstream();

    const response = await metagame.fetch(request("path=formats", "POST"));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a HEAD request as HEAD", async () => {
    const fetchMock = upstream();

    await metagame.fetch(request("path=formats", "HEAD"));

    expect(fetchMock).toHaveBeenCalledWith(
      `${UPSTREAM}/formats`,
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it.each([
    [200, "public, s-maxage=300, stale-while-revalidate=600"],
    [429, "public, s-maxage=10"],
    [500, "no-store"],
  ])(
    "passes status %i through with Cache-Control %s",
    async (status, cacheControl) => {
      upstream(status, "application/json; charset=utf-8");

      const response = await metagame.fetch(request("path=formats"));

      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe(cacheControl);
      expect(response.headers.get("content-type")).toBe(
        "application/json; charset=utf-8",
      );
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(await response.text()).toBe('{"ok":true}');
    },
  );

  it("answers 502 when Endstep cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const response = await metagame.fetch(request("path=formats"));

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Endstep is unreachable" });
  });
});
