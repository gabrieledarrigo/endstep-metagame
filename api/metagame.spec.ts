import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const UPSTREAM = "https://endstep.cc/api/metagame/v1";
const SCRYFALL = "https://api.scryfall.com/cards/collection";
const BARGAIN_ART =
  "https://cards.scryfall.io/art_crop/front/6/3/6338942d-d650-4571-8ec6-4d658792c53e.jpg?1783923877";
const GUTTERSNIPE_ART =
  "https://cards.scryfall.io/art_crop/front/f/6/f6bb1ffc-2251-4655-b8f9-4c8047dd5d5f.jpg?1785497556";
const FIVE_MINUTES = "public, s-maxage=300, stale-while-revalidate=600";
const ONE_MINUTE = "public, s-maxage=60, stale-while-revalidate=600";

type Metagame = (typeof import("./metagame"))["default"];

type ArtDeck = { slug: string; art: { cardName: string; imageUrl?: string } };

let metagame: Metagame;
let logger: (typeof import("../server/index.js"))["logger"];

beforeEach(async () => {
  vi.resetModules();
  metagame = (await import("./metagame")).default;
  logger = (await import("../server/index.js")).logger;
});

function request(query: string, method = "GET"): Request {
  return new Request(`http://localhost/api/metagame?${query}`, { method });
}

function upstream(
  status = 200,
  contentType = "application/json",
): Mock<typeof fetch> {
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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function deckList(...cardNames: string[]): { decks: { items: ArtDeck[] } } {
  return {
    decks: {
      items: cardNames.map((cardName, index) => ({
        slug: `deck-${index}`,
        art: { cardName },
      })),
    },
  };
}

function card(name: string, artCrop: string): object {
  return { name, image_uris: { art_crop: artCrop } };
}

function collection(
  data: object[],
  notFound: string[] = [],
): () => Promise<Response> {
  return async () =>
    Response.json({
      object: "list",
      not_found: notFound.map((name) => ({ name })),
      data,
    });
}

function endstepAndScryfall(
  endstep: unknown,
  scryfall: () => Promise<Response>,
  status = 200,
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (input === SCRYFALL) {
      return scryfall();
    }

    const text =
      typeof endstep === "string" ? endstep : JSON.stringify(endstep);

    return new Response(text, {
      status,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function scryfallNames(fetchMock: Mock<typeof fetch>): string[][] {
  return fetchMock.mock.calls
    .filter(([input]) => input === SCRYFALL)
    .map(([, init]) =>
      (
        JSON.parse(String(init?.body)) as { identifiers: { name: string }[] }
      ).identifiers.map(({ name }) => name),
    );
}

async function artOf(response: Response): Promise<(string | undefined)[]> {
  const body = (await response.json()) as {
    decks?: { items: ArtDeck[] };
    deck?: ArtDeck;
  };
  const decks = body.deck ? [body.deck] : (body.decks?.items ?? []);

  return decks.map((deck) => deck.art.imageUrl);
}

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

  it("forwards a deck search's term and page", async () => {
    const fetchMock = upstream();

    await metagame.fetch(
      request(
        "path=Pauper/decks&window=30d&population=rated&q=altar%20tron&sort=share&dir=desc&page=2&pageSize=24",
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${UPSTREAM}/Pauper/decks?window=30d&population=rated&q=altar+tron&sort=share&dir=desc&page=2&pageSize=24`,
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

describe("the metagame proxy's card art", () => {
  const DECKS = "path=Pauper/decks&window=30d";

  it("asks Scryfall once for a deck list's key cards, each name once, and adds each deck's art crop", async () => {
    const fetchMock = endstepAndScryfall(
      deckList("Reckoner's Bargain", "Guttersnipe", "reckoner's bargain"),
      collection([
        card("Reckoner's Bargain", BARGAIN_ART),
        card("Guttersnipe", GUTTERSNIPE_ART),
      ]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(fetchMock).toHaveBeenCalledWith(SCRYFALL, {
      method: "POST",
      headers: {
        "User-Agent":
          "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: '{"identifiers":[{"name":"Reckoner\'s Bargain"},{"name":"Guttersnipe"}]}',
      signal: expect.any(AbortSignal),
    });
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(response)).toEqual([
      BARGAIN_ART,
      GUTTERSNIPE_ART,
      BARGAIN_ART,
    ]);
  });

  it.each([
    ["no key card name", null as unknown as string],
    ["an empty key card name", ""],
    ["a blank key card name", "  "],
  ])(
    "gives the other decks their art when one deck has %s",
    async (_, cardName) => {
      const list = deckList("Guttersnipe");
      list.decks.items.unshift({ slug: "nameless", art: { cardName } });
      const fetchMock = endstepAndScryfall(
        list,
        collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
      );

      const response = await metagame.fetch(request(DECKS));

      expect(scryfallNames(fetchMock)).toEqual([["Guttersnipe"]]);
      expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
      expect(await artOf(response)).toEqual([undefined, GUTTERSNIPE_ART]);
    },
  );

  it("adds the art to a deck detail", async () => {
    endstepAndScryfall(
      {
        deck: {
          slug: "affinity-e93f5f74",
          art: { cardName: "Reckoner's Bargain" },
        },
      },
      collection([card("Reckoner's Bargain", BARGAIN_ART)]),
    );

    const response = await metagame.fetch(
      request("path=Pauper/decks/affinity-e93f5f74&window=30d"),
    );

    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(response)).toEqual([BARGAIN_ART]);
  });

  it("gives the art lookup a one-second bound", async () => {
    endstepAndScryfall(
      deckList("Guttersnipe"),
      collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await metagame.fetch(request(DECKS));

    expect(timeout.mock.calls).toEqual([[8000], [1000]]);
  });

  it("leaves a card Scryfall does not find to the fallback and keeps the usual cache time", async () => {
    endstepAndScryfall(
      deckList("Guttersnipe"),
      collection([], ["Guttersnipe"]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(response)).toEqual([undefined]);
  });

  it("sends Endstep's own text when no deck gets an address", async () => {
    const text = JSON.stringify(deckList("Guttersnipe"), null, 2);
    endstepAndScryfall(text, collection([], ["Guttersnipe"]));

    const response = await metagame.fetch(request(DECKS));

    expect(await response.text()).toBe(text);
  });

  it.each([
    [
      "times out",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
    [
      "cannot be reached",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "fails",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
  ])(
    "sends the decks without art for a minute when Scryfall %s, and asks again on the next request",
    async (_, scryfall) => {
      const fetchMock = endstepAndScryfall(deckList("Guttersnipe"), scryfall);

      const first = await metagame.fetch(request(DECKS));
      await metagame.fetch(request(DECKS));

      expect(first.status).toBe(200);
      expect(first.headers.get("cache-control")).toBe(ONE_MINUTE);
      expect(await artOf(first)).toEqual([undefined]);
      expect(scryfallNames(fetchMock)).toEqual([
        ["Guttersnipe"],
        ["Guttersnipe"],
      ]);
    },
  );

  it.each([
    [
      "a HEAD request",
      "path=Pauper/decks",
      "HEAD",
      deckList("Guttersnipe"),
      200,
    ],
    [
      "another endpoint",
      "path=Pauper/share-series",
      "GET",
      deckList("Guttersnipe"),
      200,
    ],
    [
      "an Endstep error",
      "path=Pauper/decks",
      "GET",
      deckList("Guttersnipe"),
      500,
    ],
    ["a body without decks", "path=Pauper/decks", "GET", { ok: true }, 200],
  ])(
    "sends no lookup for %s and passes the body through",
    async (_, query, method, body, status) => {
      const fetchMock = endstepAndScryfall(
        body,
        collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
        status,
      );

      const response = await metagame.fetch(request(query, method));

      expect(scryfallNames(fetchMock)).toEqual([]);
      expect(await response.text()).toBe(JSON.stringify(body));
    },
  );
});

describe("the proxy's log line", () => {
  function fromPage(query: string): Request {
    return new Request(`http://localhost/api/metagame?${query}`, {
      headers: {
        referer: "http://localhost/decks/affinity-e93f5f74?window=7d",
      },
    });
  }

  it("writes one error line, named by its endpoint, when Endstep answers 503", async () => {
    const error = vi.spyOn(logger, "error");
    upstream(503);

    const response = await metagame.fetch(
      fromPage(
        "path=Pauper/decks/affinity-e93f5f74&window=7d&population=rated",
      ),
    );

    expect(response.status).toBe(503);
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]).toEqual([
      {
        page: "/decks/affinity-e93f5f74",
        function: "metagame",
        window: "7d",
        status: 503,
        upstream: "endstep",
        calls: { total: 1, succeeded: 0, failed: 1, aborted: 0 },
        failures: { 503: 1 },
        durationMs: expect.any(Number),
      },
      "metagame Pauper/decks/affinity-e93f5f74 7d: 503, 1 of 1 Endstep calls failed (1 503)",
    ]);
  });

  it("reads a timeout as its reason when Endstep cannot be reached in time", async () => {
    const error = vi.spyOn(logger, "error");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new DOMException("The operation timed out", "TimeoutError");
      }),
    );

    const response = await metagame.fetch(fromPage("path=formats"));

    expect(response.status).toBe(502);
    expect(error.mock.calls[0]).toEqual([
      expect.objectContaining({ window: null, failures: { timeout: 1 } }),
      "metagame formats: 502, 1 of 1 Endstep calls failed (1 timeout)",
    ]);
  });

  it.each([200, 404])(
    "writes no line when Endstep answers %i",
    async (status) => {
      const error = vi.spyOn(logger, "error");
      upstream(status);

      await metagame.fetch(fromPage("path=formats"));

      expect(error).not.toHaveBeenCalled();
    },
  );
});
