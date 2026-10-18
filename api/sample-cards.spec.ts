import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const ORIGIN = "http://localhost";
const QUERY = "?deck=affinity-e93f5f74&window=30d";
const DETAIL = `${ORIGIN}/api/metagame/Pauper/decks/affinity-e93f5f74?window=30d&population=rated`;
const COLLECTION = "https://api.scryfall.com/cards/collection";
const SEARCH = "https://api.scryfall.com/cards/search";
const CDN = "https://cards.scryfall.io/normal/front/";
const AN_HOUR = "public, s-maxage=3600, stale-while-revalidate=86400";
const FIVE_MINUTES = "public, s-maxage=300, stale-while-revalidate=600";
const USER_AGENT =
  "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)";

type SampleCards = (typeof import("./sample-cards"))["default"];

type Prices = {
  tix?: string | null;
  eur?: string | null;
  usd?: string | null;
  usd_foil?: string | null;
};

type Printing = {
  name: string;
  image_uris?: { normal: string };
  prices?: Prices;
  card_faces?: { name: string; image_uris?: { normal: string } }[];
};

type Route = (url: string, init?: RequestInit) => Promise<Response>;

type Routes = {
  detail?: () => Promise<Response>;
  collection?: Route;
  search?: Route;
};

let sampleCards: SampleCards;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  sampleCards = (await import("./sample-cards")).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function settle<Value>(pending: Promise<Value>): Promise<Value> {
  let settled = false;

  void pending.finally(() => {
    settled = true;
  });

  for (let round = 0; round < 50 && !settled; round += 1) {
    await vi.runAllTimersAsync();
  }

  return pending;
}

function call(search = QUERY, method = "GET"): Promise<Response> {
  return settle(
    sampleCards.fetch(
      new Request(`${ORIGIN}/api/sample-cards${search}`, { method }),
    ),
  );
}

function listCards(names: string[]): object[] {
  return names.map((name) => ({
    name,
    count: 1,
    setCode: null,
    collectorNumber: null,
  }));
}

function detail(
  main: string[],
  side: string[] = [],
  state = "shown",
): () => Promise<Response> {
  return async (): Promise<Response> =>
    Response.json({
      deck: { slug: "affinity-e93f5f74" },
      sampleList: { state, main: listCards(main), side: listCards(side) },
    });
}

function image(name: string): string {
  return `${CDN}${name.toLowerCase().replace(/\W+/g, "-")}.jpg`;
}

function printing(name: string, prices: Prices = {}): Printing {
  return {
    name,
    image_uris: { normal: image(name) },
    prices: { tix: null, eur: null, usd: null, ...prices },
  };
}

function collectionOf(cards: Printing[]): Route {
  return async (): Promise<Response> =>
    Response.json({ object: "list", not_found: [], data: cards });
}

function termsOf(url: string): string[] {
  const query = new URL(url).searchParams.get("q") ?? "";

  return [...query.matchAll(/!"([^"]*)"/g)].map(([, name]) => name);
}

function printingNames(card: Printing): string[] {
  return [card.name, ...(card.card_faces ?? []).map((face) => face.name)].map(
    (name) => name.toLowerCase(),
  );
}

function isPriced(card: Printing): boolean {
  return [card.prices?.usd, card.prices?.eur, card.prices?.tix].some(
    (price) => Number(price) > 0,
  );
}

function matching(printings: Printing[], url: string): Printing[] {
  const asked = termsOf(url).map((name) => name.toLowerCase());

  return printings
    .filter((card) => printingNames(card).some((name) => asked.includes(name)))
    .filter(isPriced)
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

function notFound(): Response {
  return Response.json({ object: "error", code: "not_found" }, { status: 404 });
}

function searchOf(printings: Printing[]): Route {
  return async (url) => {
    const data = matching(printings, url);

    if (data.length === 0) {
      return notFound();
    }

    return Response.json({ object: "list", has_more: false, data });
  };
}

function pagedSearchOf(printings: Printing[], size: number): Route {
  return async (url) => {
    const data = matching(printings, url);
    const params = new URL(url).searchParams;
    const page = Number(params.get("page") ?? "1");
    const hasMore = page * size < data.length;

    if (data.length === 0) {
      return notFound();
    }

    params.set("page", String(page + 1));

    return Response.json({
      object: "list",
      has_more: hasMore,
      next_page: hasMore ? `${SEARCH}?${params}` : undefined,
      data: data.slice((page - 1) * size, page * size),
    });
  };
}

function firstPages(fetchMock: Mock<typeof fetch>): string[] {
  return scryfallUrls(fetchMock).filter(
    (url) => url.startsWith(SEARCH) && !new URL(url).searchParams.has("page"),
  );
}

function stub(routes: Routes): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (url.startsWith(`${ORIGIN}/api/metagame/`)) {
      return (routes.detail ?? detail([]))();
    }

    if (url === COLLECTION) {
      return (routes.collection ?? collectionOf([]))(url, init);
    }

    if (url.startsWith(`${SEARCH}?`)) {
      return (routes.search ?? searchOf([]))(url, init);
    }

    throw new Error(`Unexpected request to ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function scryfallUrls(fetchMock: Mock<typeof fetch>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.startsWith("https://api.scryfall.com/"));
}

function collectionNames(fetchMock: Mock<typeof fetch>): string[][] {
  return fetchMock.mock.calls
    .filter(([input]) => String(input) === COLLECTION)
    .map(([, init]) =>
      JSON.parse(String(init?.body)).identifiers.map(
        (identifier: { name: string }) => identifier.name,
      ),
    );
}

function searchedNames(fetchMock: Mock<typeof fetch>): string[][] {
  return scryfallUrls(fetchMock)
    .filter((url) => url.startsWith(SEARCH))
    .map(termsOf);
}

async function cardsOf(
  response: Response,
): Promise<Record<string, Record<string, unknown>>> {
  return (await response.json()).cards;
}

describe("the sample cards function's request", () => {
  it.each([
    "",
    "?",
    "?deck=affinity-e93f5f74",
    "?window=30d",
    "?window=30d&deck=affinity-e93f5f74",
    "?deck=affinity-e93f5f74&window=30d&",
    "?deck=affinity-e93f5f74&window=30d&x=1",
    "?deck=affinity-e93f5f74&window=30d&window=7d",
    "?deck=affinity-e93f5f74&deck=affinity-e93f5f74&window=30d",
    "?deck=affinity%2De93f5f74&window=30d",
    "?deck=a%2Fb&window=30d",
    "?deck=&window=30d",
    "?deck=affinity-e93f5f74&window=90d",
    "?deck=affinity-e93f5f74&window=30D",
    "?deck=affinity-e93f5f74&window=%33%30d",
    "?deck=affinity-e93f5f74&window=30d%20",
    "?deck=affinity-e93f5f74&window=",
  ])("answers 400 to %j without calling anything", async (search) => {
    const fetchMock = stub({});

    const response = await call(search);

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Unsupported sample cards query",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["1d", "7d", "14d", "30d", "season"])(
    "accepts the window %s",
    async (timeWindow) => {
      const fetchMock = stub({});

      const response = await call(
        `?deck=affinity-e93f5f74&window=${timeWindow}`,
      );

      expect(response.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toBe(
        `${ORIGIN}/api/metagame/Pauper/decks/affinity-e93f5f74?window=${timeWindow}&population=rated`,
      );
    },
  );

  it("answers the CORS preflight and refuses other methods, without calling anything", async () => {
    const fetchMock = stub({});

    const preflight = await call(QUERY, "OPTIONS");
    const post = await call(QUERY, "POST");

    expect(preflight.status).toBe(204);
    expect(post.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the deck detail through our own proxy, at the deck page's address, then asks Scryfall", async () => {
    const fetchMock = stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: searchOf([printing("Thoughtcast", { tix: "0.18" })]),
    });

    const response = await call();

    expect(String(fetchMock.mock.calls[0][0])).toBe(DETAIL);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect(await response.json()).toEqual({
      cards: {
        Thoughtcast: {
          imageUrl: image("Thoughtcast"),
          tix: 0.18,
          eur: null,
          usd: null,
        },
      },
    });
  });

  it("answers HEAD with the same headers and no body", async () => {
    stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: searchOf([printing("Thoughtcast")]),
    });

    const response = await call(QUERY, "HEAD");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect(response.body).toBeNull();
  });
});

describe("the sample cards function's deck detail", () => {
  it("answers 404 for an unknown deck, without caching or asking Scryfall", async () => {
    const fetchMock = stub({
      detail: async (): Promise<Response> =>
        Response.json({ error: "Unknown deck" }, { status: 404 }),
    });

    const response = await call();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(scryfallUrls(fetchMock)).toEqual([]);
  });

  it("answers 429 for a rate limit, held for 60 seconds", async () => {
    stub({
      detail: async (): Promise<Response> =>
        new Response(null, { status: 429 }),
    });

    const response = await call();

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
  });

  it.each([
    [
      "a server error",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
    [
      "a protected preview's refusal",
      async (): Promise<Response> => new Response("<html>", { status: 401 }),
    ],
    [
      "a network error",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "a timeout",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
    [
      "a body that is not JSON",
      async (): Promise<Response> => new Response("<html>"),
    ],
    [
      "a body without a sample list",
      async (): Promise<Response> => Response.json({ deck: {} }),
    ],
    [
      "a list that is not an array",
      async (): Promise<Response> =>
        Response.json({ sampleList: { state: "shown", main: {}, side: [] } }),
    ],
    [
      "a card without a name",
      async (): Promise<Response> =>
        Response.json({
          sampleList: { state: "shown", main: [{ count: 4 }], side: [] },
        }),
    ],
    [
      "a list without a state",
      async (): Promise<Response> =>
        Response.json({ sampleList: { main: [], side: [] } }),
    ],
  ])("answers 502 without caching for %s", async (_, answer) => {
    const fetchMock = stub({ detail: answer });

    const response = await call();

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(scryfallUrls(fetchMock)).toEqual([]);
  });

  it("gives the deck detail the proxy's 8 second timeout", async () => {
    stub({});
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await call();

    expect(timeout.mock.calls[0]).toEqual([8000]);
  });

  it("answers no cards for a withheld list, for five minutes, without asking Scryfall", async () => {
    const fetchMock = stub({
      detail: detail([], [], "withheld"),
    });

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(await response.json()).toEqual({ cards: {} });
    expect(scryfallUrls(fetchMock)).toEqual([]);
  });

  it("looks up only the main deck of a mainOnly list", async () => {
    const fetchMock = stub({
      detail: detail(["Thoughtcast"], ["Pyroblast"], "mainOnly"),
    });

    const cards = await cardsOf(await call());

    expect(Object.keys(cards)).toEqual(["Thoughtcast"]);
    expect(collectionNames(fetchMock)).toEqual([["Thoughtcast"]]);
    expect(searchedNames(fetchMock)).toEqual([["Thoughtcast"]]);
  });

  it("asks once for a card in both the main deck and the sideboard", async () => {
    const fetchMock = stub({
      detail: detail(
        ["Krark-Clan Shaman", "Thoughtcast"],
        ["Krark-Clan Shaman"],
      ),
    });

    const cards = await cardsOf(await call());

    expect(Object.keys(cards)).toEqual(["Krark-Clan Shaman", "Thoughtcast"]);
    expect(collectionNames(fetchMock)).toEqual([
      ["Krark-Clan Shaman", "Thoughtcast"],
    ]);
  });
});

describe("the sample cards function's images", () => {
  it("sends one collection request, with the headers Scryfall requires, and takes each card's normal image", async () => {
    const fetchMock = stub({
      detail: detail(["Galvanic Blast", "Thoughtcast"]),
      collection: collectionOf([
        printing("Galvanic Blast"),
        printing("Thoughtcast"),
      ]),
    });

    const cards = await cardsOf(await call());

    const init = fetchMock.mock.calls.find(
      ([input]) => String(input) === COLLECTION,
    )?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(collectionNames(fetchMock)).toEqual([
      ["Galvanic Blast", "Thoughtcast"],
    ]);
    expect(cards["Galvanic Blast"].imageUrl).toBe(image("Galvanic Blast"));
    expect(cards.Thoughtcast.imageUrl).toBe(image("Thoughtcast"));
  });

  it("matches a card with two faces by its front face, ignoring case, in both lookups, and takes the front face's image", async () => {
    const delver: Printing = {
      name: "Delver of Secrets // Insectile Aberration",
      prices: { tix: "0.03", eur: "0.32", usd: "0.25" },
      card_faces: [
        { name: "Delver of Secrets", image_uris: { normal: image("front") } },
        { name: "Insectile Aberration", image_uris: { normal: image("back") } },
      ],
    };
    stub({
      detail: detail(["delver of secrets"]),
      collection: collectionOf([delver]),
      search: searchOf([delver]),
    });

    const cards = await cardsOf(await call());

    expect(cards["delver of secrets"]).toEqual({
      imageUrl: image("front"),
      tix: 0.03,
      eur: 0.32,
      usd: 0.25,
    });
  });

  it("asks the collection for a split card by its first half, and matches it by its full name", async () => {
    const fireIce = printing("Fire // Ice", { tix: "0.28" });
    const fetchMock = stub({
      detail: detail(["Fire // Ice"]),
      collection: collectionOf([fireIce]),
      search: searchOf([fireIce]),
    });

    const cards = await cardsOf(await call());

    expect(collectionNames(fetchMock)).toEqual([["Fire"]]);
    expect(searchedNames(fetchMock)).toEqual([["Fire // Ice"]]);
    expect(cards["Fire // Ice"]).toEqual({
      imageUrl: image("Fire // Ice"),
      tix: 0.28,
      eur: null,
      usd: null,
    });
  });

  it("gives a card Scryfall does not find no image, as a stable answer", async () => {
    stub({
      detail: detail(["Sewer-veillance Cam"]),
      search: searchOf([printing("Sewer-veillance Cam", { tix: "0.02" })]),
    });

    const response = await call();

    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect(
      (await cardsOf(response))["Sewer-veillance Cam"].imageUrl,
    ).toBeNull();
  });

  it("drops an image that is not on Scryfall's CDN", async () => {
    stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([
        {
          name: "Thoughtcast",
          image_uris: { normal: "https://evil.example/a.jpg" },
        },
      ]),
    });

    const cards = await cardsOf(await call());

    expect(cards.Thoughtcast.imageUrl).toBeNull();
  });

  it("asks the collection for the basic lands' images, never searches them, and prices them at 0", async () => {
    const fetchMock = stub({
      detail: detail(["Mountain", "Island", "Thoughtcast"], ["wastes"]),
      collection: collectionOf([
        printing("Mountain"),
        printing("Island"),
        printing("Wastes"),
        printing("Thoughtcast"),
      ]),
    });

    const response = await call();
    const cards = await cardsOf(response);

    expect(collectionNames(fetchMock)).toEqual([
      ["Mountain", "Island", "Thoughtcast", "wastes"],
    ]);
    expect(searchedNames(fetchMock)).toEqual([["Thoughtcast"]]);
    expect(cards.Mountain).toEqual({
      imageUrl: image("Mountain"),
      tix: 0,
      eur: 0,
      usd: 0,
    });
    expect(cards.wastes).toEqual({
      imageUrl: image("Wastes"),
      tix: 0,
      eur: 0,
      usd: 0,
    });
  });
});

describe("the sample cards function's prices", () => {
  it("searches every printing and takes the lowest price per currency, ignoring missing and foil prices", async () => {
    const fetchMock = stub({
      detail: detail(["Galvanic Blast"]),
      search: searchOf([
        printing("Galvanic Blast", {
          tix: "0.10",
          usd: "1.00",
          usd_foil: "0.01",
        }),
        printing("Galvanic Blast", { tix: "0.05", eur: "2.00" }),
        printing("Galvanic Blast", { tix: "0.30", eur: "1.50", usd: "0.75" }),
        printing("Galvanic Blast", { tix: "", eur: "n/a" }),
      ]),
    });

    const cards = await cardsOf(await call());

    const url = new URL(scryfallUrls(fetchMock)[1]);
    expect(url.searchParams.get("unique")).toBe("prints");
    expect(url.searchParams.get("order")).toBe("name");
    expect(url.searchParams.get("q")).toBe(
      '(!"Galvanic Blast") (usd>0 or eur>0 or tix>0)',
    );
    expect(cards["Galvanic Blast"]).toMatchObject({
      tix: 0.05,
      eur: 1.5,
      usd: 0.75,
    });
  });

  it("gives a card no price in a currency none of its printings has", async () => {
    stub({
      detail: detail(["Utrom Monitor"]),
      search: searchOf([printing("Utrom Monitor", { tix: "0.04" })]),
    });

    const cards = await cardsOf(await call());

    expect(cards["Utrom Monitor"]).toMatchObject({
      tix: 0.04,
      eur: null,
      usd: null,
    });
  });

  it("prices the snow-covered basics", async () => {
    const fetchMock = stub({
      detail: detail(["Snow-Covered Island"]),
      search: searchOf([
        printing("Snow-Covered Island", {
          tix: "0.01",
          eur: "1.04",
          usd: "1.07",
        }),
      ]),
    });

    const cards = await cardsOf(await call());

    expect(searchedNames(fetchMock)).toEqual([["Snow-Covered Island"]]);
    expect(cards["Snow-Covered Island"]).toMatchObject({
      tix: 0.01,
      eur: 1.04,
      usd: 1.07,
    });
  });

  it("takes a search's 404 as no price for its names, a stable answer", async () => {
    stub({ detail: detail(["Thoughtcast", "Toxin Analysis"]) });

    const response = await call();
    const cards = await cardsOf(response);

    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect(cards.Thoughtcast).toMatchObject({
      tix: null,
      eur: null,
      usd: null,
    });
    expect(cards["Toxin Analysis"]).toMatchObject({
      tix: null,
      eur: null,
      usd: null,
    });
  });

  it("takes a 404 on a later page as a failure, not as no price", async () => {
    stub({
      detail: detail(["Seat of the Synod"]),
      collection: collectionOf([printing("Seat of the Synod")]),
      search: async (url): Promise<Response> => {
        if (new URL(url).searchParams.has("page")) {
          return notFound();
        }

        return Response.json({
          has_more: true,
          next_page: `${SEARCH}?page=2`,
          data: [printing("Seat of the Synod", { tix: "0.50" })],
        });
      },
    });

    const response = await call();

    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect((await cardsOf(response))["Seat of the Synod"].tix).toBeNull();
  });

  it("never searches a name with a double quote, and gives it no price", async () => {
    const fetchMock = stub({ detail: detail(['Kongming, "Sleeping Dragon"']) });

    const response = await call();

    expect(searchedNames(fetchMock)).toEqual([]);
    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect(
      (await cardsOf(response))['Kongming, "Sleeping Dragon"'],
    ).toMatchObject({ tix: null });
  });

  it("splits the names so that each query stays under 1,000 characters, the price filter included", async () => {
    const names = Array.from(
      { length: 50 },
      (_, index) => `A Card With A Rather Long Name Number ${index}`,
    );
    const fetchMock = stub({
      detail: detail(names),
      search: searchOf(names.map((name) => printing(name, { tix: "1.00" }))),
    });

    const response = await call();
    const queries = scryfallUrls(fetchMock)
      .filter((url) => url.startsWith(SEARCH))
      .map((url) => new URL(url).searchParams.get("q") ?? "");

    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((query) => query.length < 1000)).toBe(true);
    expect(
      queries.every((query) => query.endsWith(") (usd>0 or eur>0 or tix>0)")),
    ).toBe(true);
    expect(
      queries
        .slice(0, -1)
        .every((query) => query.length + names[0].length + 7 >= 1000),
    ).toBe(true);
    expect(searchedNames(fetchMock).flat()).toEqual(names);
    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
  });

  it("follows the next page while there are more, and prices from every page", async () => {
    const second = `${SEARCH}?page=2&q=x&unique=prints`;
    const fetchMock = stub({
      detail: detail(["Seat of the Synod"]),
      search: async (url) => {
        if (url === second) {
          return Response.json({
            has_more: false,
            data: [printing("Seat of the Synod", { tix: "0.02" })],
          });
        }

        return Response.json({
          has_more: true,
          next_page: second,
          data: [printing("Seat of the Synod", { tix: "0.50" })],
        });
      },
    });

    const response = await call();

    expect(scryfallUrls(fetchMock).at(-1)).toBe(second);
    expect(response.headers.get("cache-control")).toBe(AN_HOUR);
    expect((await cardsOf(response))["Seat of the Synod"].tix).toBe(0.02);
  });

  it("refuses a next page off Scryfall's API, and gives its names no price for five minutes", async () => {
    const fetchMock = stub({
      detail: detail(["Seat of the Synod"]),
      search: async (): Promise<Response> =>
        Response.json({
          has_more: true,
          next_page: "https://evil.example/cards/search?page=2",
          data: [printing("Seat of the Synod", { tix: "0.50" })],
        }),
    });

    const response = await call();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect((await cardsOf(response))["Seat of the Synod"].tix).toBeNull();
  });
});

describe("the sample cards function's pace", () => {
  function endlessPages(): Route {
    let page = 1;

    return async (): Promise<Response> => {
      page += 1;

      return Response.json({
        has_more: true,
        next_page: `${SEARCH}?page=${page}`,
        data: [printing("Seat of the Synod", { tix: "0.50" })],
      });
    };
  }

  it("sends Scryfall at most five requests, and gives no price to the name at the cut", async () => {
    const fetchMock = stub({
      detail: detail(["Seat of the Synod"]),
      collection: collectionOf([printing("Seat of the Synod")]),
      search: endlessPages(),
    });

    const response = await call();
    const cards = await cardsOf(response);

    expect(scryfallUrls(fetchMock)).toHaveLength(5);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(cards["Seat of the Synod"]).toEqual({
      imageUrl: image("Seat of the Synod"),
      tix: null,
      eur: null,
      usd: null,
    });
  });

  function fourNames(): Printing[] {
    return [
      printing("Alpha", { tix: "0.50" }),
      printing("Alpha", { tix: "0.30" }),
      printing("Alpha", { eur: "1.00" }),
      printing("Beta", { tix: "0.20" }),
      printing("Beta", { tix: "0.10" }),
      printing("Beta", { usd: "2.00" }),
      printing("Delta", { tix: "1.00" }),
      printing("Delta", { tix: "0.90" }),
      printing("Delta", { tix: "0.80" }),
      printing("Gamma", { tix: "3.00" }),
      printing("Gamma", { tix: "2.00" }),
    ];
  }

  it("keeps the prices of the names a cut-off search completed, and leaves the name at the cut and the later ones without", async () => {
    const fetchMock = stub({
      detail: detail(["Alpha", "Beta", "Delta", "Gamma"]),
      collection: collectionOf(
        ["Alpha", "Beta", "Delta", "Gamma"].map((name) => printing(name)),
      ),
      search: pagedSearchOf(fourNames(), 2),
    });

    const response = await call();
    const cards = await cardsOf(response);

    expect(scryfallUrls(fetchMock)).toHaveLength(5);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(cards.Alpha).toMatchObject({ tix: 0.3, eur: 1, usd: null });
    expect(cards.Beta).toMatchObject({ tix: 0.1, eur: null, usd: 2 });
    expect(cards.Delta).toMatchObject({ tix: null, eur: null, usd: null });
    expect(cards.Gamma).toMatchObject({ tix: null, eur: null, usd: null });
  });

  it("finishes a list over two calls, asking the second time only for the names still missing", async () => {
    const fetchMock = stub({
      detail: detail(["Alpha", "Beta", "Delta", "Gamma"]),
      collection: collectionOf(
        ["Alpha", "Beta", "Delta", "Gamma"].map((name) => printing(name)),
      ),
      search: pagedSearchOf(fourNames(), 2),
    });

    const first = await call();
    fetchMock.mockClear();
    vi.setSystemTime(Date.now() + 1000);
    const second = await call();
    const cards = await cardsOf(second);

    expect(first.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(collectionNames(fetchMock)).toEqual([]);
    expect(firstPages(fetchMock).map(termsOf)).toEqual([["Delta", "Gamma"]]);
    expect(second.headers.get("cache-control")).toBe(AN_HOUR);
    expect(cards.Alpha).toMatchObject({ tix: 0.3 });
    expect(cards.Beta).toMatchObject({ tix: 0.1 });
    expect(cards.Delta).toMatchObject({ tix: 0.8 });
    expect(cards.Gamma).toMatchObject({ tix: 2 });
  });

  it("starts Scryfall's requests one after another, at least 500ms apart", async () => {
    const starts: number[] = [];
    const fetchMock = stub({
      detail: detail(["Seat of the Synod"]),
      search: endlessPages(),
    });
    const route = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).startsWith("https://api.scryfall.com/")) {
        starts.push(Date.now());
      }

      return route!(input, init);
    });

    await call();

    expect(starts).toHaveLength(5);
    starts.slice(1).forEach((start, index) => {
      expect(start - starts[index]).toBe(500);
    });
  });

  it("spaces the requests of two calls that run at once on one instance", async () => {
    const starts: number[] = [];
    const fetchMock = stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: searchOf([printing("Thoughtcast")]),
    });
    const route = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).startsWith("https://api.scryfall.com/")) {
        starts.push(Date.now());
      }

      return route!(input, init);
    });

    await settle(
      Promise.all([
        sampleCards.fetch(new Request(`${ORIGIN}/api/sample-cards${QUERY}`)),
        sampleCards.fetch(
          new Request(`${ORIGIN}/api/sample-cards?deck=other-deck&window=30d`),
        ),
      ]),
    );

    expect(starts.length).toBeGreaterThan(2);
    starts.slice(1).forEach((start, index) => {
      expect(start - starts[index]).toBeGreaterThanOrEqual(500);
    });
  });

  it("bounds every Scryfall request by what is left of 6 seconds, and sends none past it", async () => {
    const fetchMock = stub({
      detail: detail(["Seat of the Synod"]),
      collection: async (): Promise<Response> => {
        vi.setSystemTime(Date.now() + 2500);
        return collectionOf([printing("Seat of the Synod")])("");
      },
      search: async (url) => {
        vi.setSystemTime(Date.now() + 2500);
        return endlessPages()(url);
      },
    });
    const timeout = vi.spyOn(AbortSignal, "timeout");

    const response = await call();

    expect(scryfallUrls(fetchMock)).toHaveLength(3);
    expect(timeout.mock.calls).toEqual([[8000], [6000], [3500], [1000]]);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect((await cardsOf(response))["Seat of the Synod"].imageUrl).toBe(
      image("Seat of the Synod"),
    );
  });

  it("keeps the images when the search runs out of time", async () => {
    stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    });

    const response = await call();

    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect((await cardsOf(response)).Thoughtcast).toEqual({
      imageUrl: image("Thoughtcast"),
      tix: null,
      eur: null,
      usd: null,
    });
  });
});

describe("the sample cards function's memory", () => {
  function thoughtcast(): Routes {
    return {
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: searchOf([printing("Thoughtcast", { tix: "0.18" })]),
    };
  }

  it("answers from memory within the hour, and asks Scryfall again after it", async () => {
    const fetchMock = stub(thoughtcast());

    await call();
    const second = await call();

    expect(scryfallUrls(fetchMock)).toHaveLength(2);
    expect(second.headers.get("cache-control")).toBe(AN_HOUR);
    expect((await cardsOf(second)).Thoughtcast).toEqual({
      imageUrl: image("Thoughtcast"),
      tix: 0.18,
      eur: null,
      usd: null,
    });

    vi.setSystemTime(Date.now() + 3_600_000);
    await call();

    expect(scryfallUrls(fetchMock)).toHaveLength(4);
  });

  it("asks only for the names it has not seen", async () => {
    let list = ["Thoughtcast"];
    const fetchMock = stub({
      ...thoughtcast(),
      detail: async (): Promise<Response> => detail(list)(),
    });

    await call();
    fetchMock.mockClear();
    list = ["Thoughtcast", "Pyroblast"];
    await call();

    expect(collectionNames(fetchMock)).toEqual([["Pyroblast"]]);
    expect(searchedNames(fetchMock)).toEqual([["Pyroblast"]]);
  });

  it("stores nothing from a failed lookup, and asks again on the next call", async () => {
    const fetchMock = stub({
      detail: detail(["Thoughtcast"]),
      collection: async (): Promise<Response> =>
        new Response(null, { status: 500 }),
      search: async (): Promise<Response> =>
        new Response(null, { status: 500 }),
    });

    await call();
    vi.setSystemTime(Date.now() + 1000);
    await call();

    expect(collectionNames(fetchMock)).toEqual([
      ["Thoughtcast"],
      ["Thoughtcast"],
    ]);
    expect(searchedNames(fetchMock)).toEqual([
      ["Thoughtcast"],
      ["Thoughtcast"],
    ]);
  });
});

describe("the sample cards function's Scryfall failures", () => {
  it("stops at a 429 for five minutes, and sends Scryfall nothing for 30 seconds", async () => {
    const fetchMock = stub({
      detail: detail(["Thoughtcast"]),
      collection: async (): Promise<Response> =>
        new Response(null, { status: 429 }),
    });

    const first = await call();
    vi.setSystemTime(Date.now() + 29_000);
    await call();

    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(scryfallUrls(fetchMock)).toEqual([COLLECTION]);

    vi.setSystemTime(Date.now() + 1000);
    await call();

    expect(scryfallUrls(fetchMock)).toHaveLength(2);
  });

  it.each([
    [
      "fails",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
    [
      "cannot be reached",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "answers a body that is not JSON",
      async (): Promise<Response> => new Response("<html>"),
    ],
    [
      "answers data that is not a list",
      async (): Promise<Response> => Response.json({ data: {} }),
    ],
    [
      "answers a card without a name",
      async (): Promise<Response> =>
        Response.json({ data: [{ image_uris: {} }] }),
    ],
    [
      "answers faces without names",
      async (): Promise<Response> =>
        Response.json({ data: [{ name: "A", card_faces: [{}] }] }),
    ],
  ])(
    "still searches the prices when the collection %s, and answers for five minutes",
    async (_, collection) => {
      const fetchMock = stub({
        detail: detail(["Thoughtcast"]),
        collection,
        search: searchOf([printing("Thoughtcast", { tix: "0.18" })]),
      });

      const response = await call();

      expect(searchedNames(fetchMock)).toEqual([["Thoughtcast"]]);
      expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
      expect((await cardsOf(response)).Thoughtcast).toEqual({
        imageUrl: null,
        tix: 0.18,
        eur: null,
        usd: null,
      });
    },
  );

  it("gives no price for five minutes when a search fails", async () => {
    stub({
      detail: detail(["Thoughtcast"]),
      collection: collectionOf([printing("Thoughtcast")]),
      search: async (): Promise<Response> =>
        new Response(null, { status: 503 }),
    });

    const response = await call();

    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect((await cardsOf(response)).Thoughtcast.tix).toBeNull();
  });

  it("cancels the body of a failed answer, so the connection is freed", async () => {
    const cancel = vi.fn();
    stub({
      detail: detail(["Thoughtcast"]),
      collection: async (): Promise<Response> =>
        new Response(new ReadableStream({ cancel }), { status: 500 }),
    });

    await call();

    expect(cancel).toHaveBeenCalledOnce();
  });
});
