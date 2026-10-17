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
const DELVER_ART =
  "https://cards.scryfall.io/art_crop/front/6/9/6904ea20-e504-47da-95a0-08739fdde260.jpg?1783908173";
const FIVE_MINUTES = "public, s-maxage=300, stale-while-revalidate=600";
const ONE_MINUTE = "public, s-maxage=60, stale-while-revalidate=600";

type Metagame = (typeof import("./metagame"))["default"];

type ArtDeck = { slug: string; art: { cardName: string; imageUrl?: string } };

let metagame: Metagame;

beforeEach(async () => {
  vi.resetModules();
  metagame = (await import("./metagame")).default;
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
          "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/endstep-metagame)",
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

  it("gives the other decks their art when one deck has no key card name", async () => {
    const list = deckList("Guttersnipe");
    list.decks.items.unshift({
      slug: "nameless",
      art: { cardName: null as unknown as string },
    });
    const fetchMock = endstepAndScryfall(
      list,
      collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(scryfallNames(fetchMock)).toEqual([["Guttersnipe"]]);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(response)).toEqual([undefined, GUTTERSNIPE_ART]);
  });

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

  it("matches a double-faced card by its front face, ignoring case, and takes the front face's art", async () => {
    endstepAndScryfall(
      deckList("delver of secrets"),
      collection([
        {
          name: "Delver of Secrets // Insectile Aberration",
          card_faces: [
            {
              name: "Delver of Secrets",
              image_uris: { art_crop: DELVER_ART },
            },
            {
              name: "Insectile Aberration",
              image_uris: {
                art_crop: DELVER_ART.replace("/front/", "/back/"),
              },
            },
          ],
        },
      ]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(await artOf(response)).toEqual([DELVER_ART]);
  });

  it.each([
    [
      "a back face's name the back face's art",
      "Insectile Aberration",
      "/back/",
    ],
    [
      "a double-faced card's full name the front face's art",
      "Delver of Secrets // Insectile Aberration",
      "/front/",
    ],
  ])("gives %s", async (_, cardName, side) => {
    const back = DELVER_ART.replace("/front/", "/back/");
    endstepAndScryfall(
      deckList(cardName),
      collection([
        {
          name: "Delver of Secrets // Insectile Aberration",
          card_faces: [
            { name: "Delver of Secrets", image_uris: { art_crop: DELVER_ART } },
            { name: "Insectile Aberration", image_uris: { art_crop: back } },
          ],
        },
      ]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(await artOf(response)).toEqual([
      DELVER_ART.replace("/front/", side),
    ]);
  });

  it("gives a face without its own image the card's art, as for an adventure", async () => {
    const giant =
      "https://cards.scryfall.io/art_crop/front/1/a/1a8bdc8b-bonecrusher-giant.jpg?1";
    endstepAndScryfall(
      deckList("Stomp"),
      collection([
        {
          name: "Bonecrusher Giant // Stomp",
          image_uris: { art_crop: giant },
          card_faces: [{ name: "Bonecrusher Giant" }, { name: "Stomp" }],
        },
      ]),
    );

    const response = await metagame.fetch(request(DECKS));

    expect(await artOf(response)).toEqual([giant]);
  });

  it("leaves a card Scryfall does not find to the fallback, keeps the usual cache time, and never asks for it again", async () => {
    const fetchMock = endstepAndScryfall(
      deckList("Fire // Ice"),
      collection([], ["Fire // Ice"]),
    );

    const first = await metagame.fetch(request(DECKS));
    const second = await metagame.fetch(request(DECKS));

    expect(first.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(first)).toEqual([undefined]);
    expect(second.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(scryfallNames(fetchMock)).toEqual([["Fire // Ice"]]);
  });

  it("treats a name Scryfall answers with another spelling as not found: the fallback, the usual cache time, and no second request", async () => {
    const fetchMock = endstepAndScryfall(
      deckList("Lim-Dul's Vault"),
      collection([
        card(
          "Lim-Dûl's Vault",
          "https://cards.scryfall.io/art_crop/front/1/2/12345678-lim-dul.jpg?1",
        ),
      ]),
    );

    const first = await metagame.fetch(request(DECKS));
    const second = await metagame.fetch(request(DECKS));

    expect(first.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await artOf(first)).toEqual([undefined]);
    expect(second.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(scryfallNames(fetchMock)).toEqual([["Lim-Dul's Vault"]]);
  });

  it("sends Endstep's own text when no deck gets an address", async () => {
    const text = JSON.stringify(deckList("Fire // Ice"), null, 2);
    endstepAndScryfall(text, collection([], ["Fire // Ice"]));

    const response = await metagame.fetch(request(DECKS));

    expect(await response.text()).toBe(text);
  });

  it("asks Scryfall only for the names it has not seen", async () => {
    const fetchMock = endstepAndScryfall(
      deckList("Reckoner's Bargain"),
      collection([card("Reckoner's Bargain", BARGAIN_ART)]),
    );
    await metagame.fetch(request(DECKS));

    endstepAndScryfall(
      deckList("Reckoner's Bargain", "Guttersnipe"),
      collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
    );
    const second = vi.mocked(fetch);
    const response = await metagame.fetch(request(DECKS));

    expect(scryfallNames(fetchMock)).toEqual([["Reckoner's Bargain"]]);
    expect(scryfallNames(second)).toEqual([["Guttersnipe"]]);
    expect(await artOf(response)).toEqual([BARGAIN_ART, GUTTERSNIPE_ART]);
  });

  it("gives the lookup a one-second bound", async () => {
    endstepAndScryfall(
      deckList("Guttersnipe"),
      collection([card("Guttersnipe", GUTTERSNIPE_ART)]),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await metagame.fetch(request(DECKS));

    expect(timeout.mock.calls).toEqual([[8000], [1000]]);
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

  it.each([429, 500])(
    "cancels the body of a %i from Scryfall, so the connection is freed",
    async (status) => {
      const cancel = vi.fn();
      endstepAndScryfall(
        deckList("Guttersnipe"),
        async () => new Response(new ReadableStream({ cancel }), { status }),
      );

      await metagame.fetch(request(DECKS));

      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["no data", {}],
    ["data that is not a list", { data: null }],
    ["a card that is not an object", { data: [null] }],
    ["a name that is not a string", { data: [{ name: 5 }] }],
    [
      "faces that are not a list",
      { data: [{ name: "Guttersnipe", card_faces: {} }] },
    ],
    ["no faces", { data: [{ name: "Guttersnipe", card_faces: null }] }],
    [
      "images that are not an object",
      { data: [{ name: "Guttersnipe", image_uris: "guttersnipe.jpg" }] },
    ],
    [
      "an art crop that is not a string",
      { data: [{ name: "Guttersnipe", image_uris: { art_crop: 5 } }] },
    ],
  ])(
    "treats a 200 with %s as a failed lookup: the fallback for a minute, and nothing remembered",
    async (_, payload) => {
      const fetchMock = endstepAndScryfall(deckList("Guttersnipe"), async () =>
        Response.json(payload),
      );

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

  it("sends Scryfall nothing for 30 seconds after a 429, and keeps the art it already has", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetchMock = endstepAndScryfall(
      deckList("Reckoner's Bargain"),
      collection([card("Reckoner's Bargain", BARGAIN_ART)]),
    );
    await metagame.fetch(request(DECKS));

    endstepAndScryfall(
      deckList("Reckoner's Bargain", "Guttersnipe"),
      async () => new Response(null, { status: 429 }),
    );
    const limited = vi.mocked(fetch);
    const rateLimited = await metagame.fetch(request(DECKS));
    vi.advanceTimersByTime(29_999);
    const paused = await metagame.fetch(request(DECKS));
    vi.advanceTimersByTime(1);
    await metagame.fetch(request(DECKS));

    expect(scryfallNames(fetchMock)).toEqual([["Reckoner's Bargain"]]);
    expect(rateLimited.headers.get("cache-control")).toBe(ONE_MINUTE);
    expect(paused.headers.get("cache-control")).toBe(ONE_MINUTE);
    expect(await artOf(paused)).toEqual([BARGAIN_ART, undefined]);
    expect(scryfallNames(limited)).toEqual([["Guttersnipe"], ["Guttersnipe"]]);
  });

  it.each([
    [
      "an address outside Scryfall's CDN",
      { art_crop: "https://example.com/guttersnipe.jpg" },
    ],
    ["no art crop", {}],
  ])(
    "treats a card with %s as not found: the fallback, the usual cache time, and no second request",
    async (_, imageUris) => {
      const fetchMock = endstepAndScryfall(
        deckList("Guttersnipe"),
        collection([{ name: "Guttersnipe", image_uris: imageUris }]),
      );

      const response = await metagame.fetch(request(DECKS));
      await metagame.fetch(request(DECKS));

      expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
      expect(await artOf(response)).toEqual([undefined]);
      expect(scryfallNames(fetchMock)).toEqual([["Guttersnipe"]]);
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
