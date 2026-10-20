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
const COUNTERSPELL_ART =
  "https://cards.scryfall.io/art_crop/front/1/b/1b73577a-counterspell.jpg?1";
const HALF_HOUR = "public, s-maxage=1800, stale-while-revalidate=1800";
const FIVE_MINUTES = "public, s-maxage=300, stale-while-revalidate=600";

type Staples = (typeof import("./staples"))["default"];

type Row = [name: string, rate: number, copies: number];

type Deck = { slug: string; name: string; share: { rate: number } };

type Page = { withheld?: unknown; total?: number; rows: Row[] };

type Body = {
  window: { from: string; to: string };
  section: string;
  withheld: number;
  cards: {
    name: string;
    share: number;
    copies: number;
    art: { imageUrl: string } | null;
    decks: { slug: string; name: string; playRate: number; copies: number }[];
  }[];
};

type Upstream = {
  decks: Deck[];
  pages?: Record<string, Page[]>;
  status?: (url: URL) => number | undefined;
  delay?: (url: URL) => number;
  scryfall?: () => Promise<Response>;
};

let staples: Staples;

beforeEach(async () => {
  vi.resetModules();
  staples = (await import("./staples")).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function request(search: string, method = "GET"): Request {
  return new Request(`http://localhost/api/staples${search}`, { method });
}

const MAIN_30D = "?window=30d&section=main";

function deck(slug: string, share: number): Deck {
  return { slug, name: slug.toUpperCase(), share: { rate: share } };
}

function cardsBody(page: Page, pageNumber: number): object {
  return {
    withheld: "withheld" in page ? page.withheld : null,
    cards: {
      items: page.rows.map(([name, rate, copies]) => ({
        name,
        playRate: { count: 1, of: 1, rate },
        averageCopies: copies,
      })),
      total: page.total ?? page.rows.length,
      page: pageNumber,
      pageSize: 50,
    },
  };
}

function paged(rows: Row[]): Page[] {
  return [
    { total: rows.length, rows: rows.slice(0, 50) },
    { total: rows.length, rows: rows.slice(50) },
  ];
}

function collection(...names: string[]): () => Promise<Response> {
  return async () =>
    Response.json({
      not_found: [],
      data: names.map((name) => ({
        name,
        image_uris: { art_crop: COUNTERSPELL_ART },
      })),
    });
}

function endstep({
  decks,
  pages = {},
  status = (): undefined => undefined,
  delay = (): number => 0,
  scryfall = collection(),
}: Upstream): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    const wait = delay(url);

    if (wait > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, wait);
      });
    }

    if (String(input) === SCRYFALL) {
      return scryfall();
    }

    const failure = status(url);

    if (failure !== undefined) {
      return new Response(null, { status: failure });
    }

    if (url.pathname.endsWith("/Pauper/decks")) {
      return Response.json({
        provenance: { window: { from: "2026-09-21", to: "2026-10-21" } },
        decks: { items: decks },
      });
    }

    const slug = url.pathname.split("/").at(-2) ?? "";
    const page = Number(url.searchParams.get("page"));

    return Response.json(cardsBody(pages[slug][page - 1], page));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calls(fetchMock: Mock<typeof fetch>): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

function pagesOf(fetchMock: Mock<typeof fetch>, slug: string): number[] {
  return calls(fetchMock)
    .filter((url) => url.includes(`/decks/${slug}/cards`))
    .map((url) => Number(new URL(url).searchParams.get("page")));
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

async function bodyOf(response: Response): Promise<Body> {
  return (await response.json()) as Body;
}

describe("the staples function's query", () => {
  it.each([
    ["no query", ""],
    ["no section", "?window=30d"],
    ["the parameters swapped", "?section=main&window=30d"],
    ["an unknown window", "?window=90d&section=main"],
    ["an unknown section", "?window=30d&section=sideboard"],
    ["an encoded value", "?window=30d&section=m%61in"],
    ["a padded value", "?window=30d&section=main%20"],
    ["a repeated section", "?window=30d&section=main&section=side"],
    ["an extra parameter", "?window=30d&section=main&page=2"],
    ["a trailing ampersand", "?window=30d&section=main&"],
    ["an upper-case section", "?window=30d&section=Main"],
  ])("refuses %s with 400, without calling Endstep", async (_, search) => {
    const fetchMock = endstep({ decks: [] });

    const response = await staples.fetch(request(search));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Unsupported staples query",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["1d", "7d", "14d", "30d", "season"])(
    "accepts the %s window with either section",
    async (timeWindow) => {
      endstep({ decks: [] });

      const main = await staples.fetch(
        request(`?window=${timeWindow}&section=main`),
      );
      const side = await staples.fetch(
        request(`?window=${timeWindow}&section=side`),
      );

      expect(main.status).toBe(200);
      expect((await bodyOf(side)).section).toBe("side");
    },
  );

  it("refuses a POST without calling Endstep", async () => {
    const fetchMock = endstep({ decks: [] });

    const response = await staples.fetch(request(MAIN_30D, "POST"));

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers the CORS preflight without calling Endstep", async () => {
    const fetchMock = endstep({ decks: [] });

    const response = await staples.fetch(request(MAIN_30D, "OPTIONS"));

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the staples function's calls", () => {
  it("fetches the top 24 decks, then each deck's card table for the section: 8 seconds for the list, 20 for each table and 3 for Scryfall", async () => {
    const fetchMock = endstep({
      decks: [deck("a", 0.2), deck("b", 0.1)],
      pages: {
        a: [{ rows: [["Counterspell", 1, 4]] }],
        b: [{ rows: [["Counterspell", 1, 4]] }],
      },
      scryfall: collection("Counterspell"),
    });
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await staples.fetch(request("?window=7d&section=side"));

    expect(calls(fetchMock)).toEqual([
      `${UPSTREAM}/Pauper/decks?window=7d&population=rated&sort=share&dir=desc&pageSize=24`,
      `${UPSTREAM}/Pauper/decks/a/cards?window=7d&population=rated&section=side&pageSize=50&page=1`,
      `${UPSTREAM}/Pauper/decks/b/cards?window=7d&population=rated&section=side&pageSize=50&page=1`,
      SCRYFALL,
    ]);
    expect(timeout.mock.calls).toEqual([[8000], [20000], [20000], [3000]]);
  });

  it("fetches a deck's next page while the last card is in at least 5% of its lists", async () => {
    const fetchMock = endstep({
      decks: [deck("a", 0.2)],
      pages: {
        a: [
          { total: 150, rows: [["Counterspell", 0.05, 4]] },
          { total: 150, rows: [["Brainstorm", 0.0499, 4]] },
          { total: 150, rows: [["Ponder", 0.01, 4]] },
        ],
      },
    });

    await staples.fetch(request(MAIN_30D));

    expect(pagesOf(fetchMock, "a")).toEqual([1, 2]);
  });

  it("stops at the end of a deck's table", async () => {
    const fetchMock = endstep({
      decks: [deck("a", 0.2)],
      pages: {
        a: [
          { total: 100, rows: [["Counterspell", 0.9, 4]] },
          { total: 100, rows: [["Brainstorm", 0.8, 4]] },
          { total: 100, rows: [["Ponder", 0.7, 4]] },
        ],
      },
    });

    await staples.fetch(request(MAIN_30D));

    expect(pagesOf(fetchMock, "a")).toEqual([1, 2]);
  });

  it("stops at an empty page", async () => {
    const fetchMock = endstep({
      decks: [deck("a", 0.2)],
      pages: { a: [{ total: 100, rows: [] }] },
    });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(200);
    expect(pagesOf(fetchMock, "a")).toEqual([1]);
  });

  it("reads at most 4 pages of a deck", async () => {
    const page: Page = { total: 1000, rows: [["Counterspell", 0.9, 4]] };
    const fetchMock = endstep({
      decks: [deck("a", 0.2)],
      pages: { a: [page, page, page, page, page] },
    });

    await staples.fetch(request(MAIN_30D));

    expect(pagesOf(fetchMock, "a")).toEqual([1, 2, 3, 4]);
  });
});

describe("the staples function's cards", () => {
  const decks = [deck("a", 0.2), deck("b", 0.1), deck("c", 0.1)];
  const pages: Record<string, Page[]> = {
    a: [
      {
        rows: [
          ["Counterspell", 1, 4],
          ["Brainstorm", 0.5, 2],
        ],
      },
    ],
    b: [{ rows: [["Counterspell", 0.5, 2]] }],
    c: [{ rows: [["Brainstorm", 0.25, 4]] }],
  };

  it("weights each card's share and copies by each deck's share and play rate", async () => {
    endstep({ decks, pages, scryfall: collection("Counterspell") });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.window).toEqual({ from: "2026-09-21", to: "2026-10-21" });
    expect(body.section).toBe("main");
    expect(body.withheld).toBe(0);
    expect(body.cards.map((card) => card.name)).toEqual([
      "Counterspell",
      "Brainstorm",
    ]);
    expect(body.cards[0].share).toBeCloseTo(0.625, 10);
    expect(body.cards[0].copies).toBeCloseTo(3.6, 10);
    expect(body.cards[1].share).toBeCloseTo(0.3125, 10);
    expect(body.cards[1].copies).toBeCloseTo(2.4, 10);
    expect(body.cards[0].decks).toEqual([
      { slug: "a", name: "A", playRate: 1, copies: 4 },
      { slug: "b", name: "B", playRate: 0.5, copies: 2 },
    ]);
    expect(body.cards[0].art).toEqual({ imageUrl: COUNTERSPELL_ART });
    expect(body.cards[1].art).toBeNull();
  });

  it("counts a card once per deck when it moves across a page boundary between two pages", async () => {
    endstep({
      decks: [deck("a", 0.2)],
      pages: {
        a: [
          {
            total: 100,
            rows: [
              ["Counterspell", 1, 4],
              ["Ponder", 0.5, 2],
            ],
          },
          {
            total: 100,
            rows: [
              ["Ponder", 0.49, 3],
              ["Preordain", 0.01, 1],
            ],
          },
        ],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));
    const ponder = body.cards.find((card) => card.name === "Ponder");

    expect(body.cards.map((card) => card.name)).toEqual([
      "Counterspell",
      "Ponder",
      "Preordain",
    ]);
    expect(ponder?.share).toBeCloseTo(0.5, 10);
    expect(ponder?.copies).toBeCloseTo(2, 10);
    expect(ponder?.decks).toEqual([
      { slug: "a", name: "A", playRate: 0.5, copies: 2 },
    ]);
  });

  it("leaves out a withheld deck, divides by the counted decks' share, and counts it", async () => {
    endstep({
      decks: [...decks, deck("d", 0.6)],
      pages: {
        ...pages,
        d: [
          {
            withheld: { reason: "below_player_floor", minPlayers: 3 },
            rows: [],
            total: 0,
          },
        ],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.withheld).toBe(1);
    expect(body.cards[0].share).toBeCloseTo(0.625, 10);
    expect(body.cards[0].decks.map((entry) => entry.slug)).toEqual(["a", "b"]);
  });

  it("leaves out a deck withheld on a later page", async () => {
    endstep({
      decks: [deck("a", 0.2), deck("b", 0.2)],
      pages: {
        a: [{ rows: [["Counterspell", 1, 4]] }],
        b: [
          { total: 100, rows: [["Brainstorm", 1, 4]] },
          { withheld: { reason: "below_player_floor" }, rows: [] },
        ],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.withheld).toBe(1);
    expect(body.cards.map((card) => card.name)).toEqual(["Counterspell"]);
  });

  it.each([
    ["null", null],
    ["missing", undefined],
    ["a string", "no"],
  ])("counts a deck whose withheld field is %s", async (_, withheld) => {
    endstep({
      decks: [deck("a", 0.2)],
      pages: { a: [{ withheld, rows: [["Counterspell", 1, 4]] }] },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.withheld).toBe(0);
    expect(body.cards.map((card) => card.name)).toEqual(["Counterspell"]);
  });

  it("answers 502 for a card table with no cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) =>
        String(input).includes("/cards")
          ? Response.json({ section: "main" })
          : Response.json({
              provenance: { window: { from: "2026-09-21", to: "2026-10-21" } },
              decks: { items: [deck("a", 0.2)] },
            }),
      ),
    );

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(502);
  });

  it("leaves out a card whose weight is zero, so no share or copies is NaN", async () => {
    endstep({
      decks: [deck("a", 0.2), deck("z", 0)],
      pages: {
        a: [
          {
            rows: [
              ["Counterspell", 1, 4],
              ["Ponder", 0, 0],
            ],
          },
        ],
        z: [{ rows: [["Preordain", 1, 4]] }],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.cards.map((card) => card.name)).toEqual(["Counterspell"]);
    expect(body.cards[0].share).toBe(1);
    expect(body.cards[0].copies).toBe(4);
  });

  it("answers no cards when every counted deck has a share of zero", async () => {
    endstep({
      decks: [deck("z", 0)],
      pages: { z: [{ rows: [["Preordain", 1, 4]] }] },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.cards).toEqual([]);
  });

  it("answers no cards, and asks Scryfall nothing, when every deck is withheld", async () => {
    const withheld: Page = { withheld: { reason: "x" }, rows: [] };
    const fetchMock = endstep({
      decks: [deck("a", 0.2), deck("b", 0.1)],
      pages: { a: [withheld], b: [withheld] },
    });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.headers.get("cache-control")).toBe(HALF_HOUR);
    expect(await bodyOf(response)).toEqual({
      window: { from: "2026-09-21", to: "2026-10-21" },
      section: "main",
      withheld: 2,
      cards: [],
    });
    expect(scryfallNames(fetchMock)).toEqual([]);
  });

  it("leaves out the basic lands and their snow-covered versions, in any case", async () => {
    endstep({
      decks: [deck("a", 0.2)],
      pages: {
        a: [
          {
            rows: [
              ["Island", 1, 8],
              ["Snow-Covered Island", 1, 2],
              ["Plains", 1, 1],
              ["Swamp", 1, 1],
              ["Mountain", 1, 1],
              ["forest", 1, 1],
              ["Wastes", 1, 1],
              ["Snow-Covered Plains", 1, 1],
              ["Snow-Covered Swamp", 1, 1],
              ["Snow-Covered Mountain", 1, 1],
              ["Snow-Covered Forest", 1, 1],
              ["Snow-Covered Wastes", 1, 1],
              ["Dimir Aqueduct", 0.5, 1],
            ],
          },
        ],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.cards.map((card) => card.name)).toEqual(["Dimir Aqueduct"]);
  });

  it("lists the decks that play a card in at least 5% of their lists, by play rate, ties in share order", async () => {
    endstep({
      decks: [deck("a", 0.4), deck("b", 0.3), deck("c", 0.2), deck("d", 0.1)],
      pages: {
        a: [{ rows: [["Counterspell", 0.05, 1]] }],
        b: [{ rows: [["Counterspell", 0.0499, 1]] }],
        c: [{ rows: [["Counterspell", 0.6, 4]] }],
        d: [{ rows: [["Counterspell", 0.05, 2]] }],
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));

    expect(body.cards[0].decks.map((entry) => entry.slug)).toEqual([
      "c",
      "a",
      "d",
    ]);
    expect(body.cards[0].share).toBeCloseTo(
      0.4 * 0.05 + 0.3 * 0.0499 + 0.2 * 0.6 + 0.1 * 0.05,
      10,
    );
  });

  it("keeps the 50 largest cards, ties by name", async () => {
    const rows: Row[] = Array.from({ length: 60 }, (_, index) => [
      `Card ${String(index).padStart(2, "0")}`,
      1 - index / 100,
      1,
    ]);
    endstep({
      decks: [deck("a", 0.2)],
      pages: {
        a: paged([
          ["Lórien Revealed", 1, 1],
          ["Brainstorm", 1, 1],
          ["Lotus Petal", 1, 1],
          ...rows,
        ]),
      },
    });

    const body = await bodyOf(await staples.fetch(request(MAIN_30D)));
    const names = body.cards.map((card) => card.name);

    expect(names).toHaveLength(50);
    expect(names.slice(0, 6)).toEqual([
      "Brainstorm",
      "Card 00",
      "Lórien Revealed",
      "Lotus Petal",
      "Card 01",
      "Card 02",
    ]);
    expect(names.at(-1)).toBe("Card 46");
  });

  it("asks Scryfall for the art of the kept cards only", async () => {
    const rows: Row[] = Array.from({ length: 55 }, (_, index) => [
      `Card ${String(index).padStart(2, "0")}`,
      1 - index / 100,
      1,
    ]);
    const fetchMock = endstep({
      decks: [deck("a", 0.2)],
      pages: { a: paged(rows) },
    });

    await staples.fetch(request(MAIN_30D));

    expect(scryfallNames(fetchMock)).toEqual([
      rows.slice(0, 50).map(([name]) => name),
    ]);
  });
});

describe("the staples function's responses", () => {
  const decks = [deck("a", 0.2)];
  const pages = { a: [{ rows: [["Counterspell", 1, 4]] as Row[] }] };

  it("caches a success for 30 minutes, with the CORS headers", async () => {
    endstep({ decks, pages, scryfall: collection("Counterspell") });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(HALF_HOUR);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it("keeps the 30 minutes when Scryfall does not find a card", async () => {
    endstep({ decks, pages, scryfall: collection() });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.headers.get("cache-control")).toBe(HALF_HOUR);
    expect((await bodyOf(response)).cards[0].art).toBeNull();
  });

  it.each([
    [
      "fails",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
    [
      "rate limits the lookup",
      async (): Promise<Response> => new Response(null, { status: 429 }),
    ],
    [
      "times out",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
  ])(
    "sends the cards without art for five minutes when Scryfall %s",
    async (_, scryfall) => {
      endstep({ decks, pages, scryfall });

      const response = await staples.fetch(request(MAIN_30D));

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
      expect((await bodyOf(response)).cards[0]).toMatchObject({
        name: "Counterspell",
        art: null,
      });
    },
  );

  it("answers a HEAD request without a body, with the success's cache time", async () => {
    endstep({ decks, pages, scryfall: collection("Counterspell") });

    const response = await staples.fetch(request(MAIN_30D, "HEAD"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(HALF_HOUR);
    expect(await response.text()).toBe("");
  });

  it("answers 429, held for 60 seconds, when one deck is rate limited and an earlier deck fails later", async () => {
    endstep({
      decks: [deck("a", 0.2), deck("b", 0.1)],
      status: (url) => {
        if (url.pathname.includes("/decks/a/")) {
          return 500;
        }

        if (url.pathname.includes("/decks/b/")) {
          return 429;
        }

        return undefined;
      },
      delay: (url) => (url.pathname.includes("/decks/a/") ? 20 : 0),
    });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
    expect(await response.json()).toEqual({
      error: "Endstep's rate limit was reached",
    });
  });

  it.each([
    [
      "the deck list fails",
      (url: URL): number | undefined =>
        url.pathname.endsWith("/decks") ? 500 : undefined,
    ],
    [
      "a card table fails",
      (url: URL): number | undefined =>
        url.pathname.endsWith("/cards") ? 503 : undefined,
    ],
  ])("answers 502 when %s", async (_, status) => {
    endstep({ decks, pages, status });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Endstep did not answer every call",
    });
  });

  it("stops the other decks' pages after the first failure, and still answers its 429", async () => {
    const fetchMock = endstep({
      decks: [deck("a", 0.2), deck("b", 0.1)],
      pages: {
        b: [
          { total: 200, rows: [["Counterspell", 1, 4]] },
          { total: 200, rows: [["Brainstorm", 1, 4]] },
        ],
      },
      status: (url) => (url.pathname.includes("/decks/a/") ? 429 : undefined),
      delay: (url) => (url.pathname.includes("/decks/b/") ? 20 : 0),
    });

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(429);
    expect(pagesOf(fetchMock, "a")).toEqual([1]);
    expect(pagesOf(fetchMock, "b")).toEqual([1]);
  });

  it("aborts the open card tables and answers 502 after 50 seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const aborted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const url = String(input);

        if (url.includes("/cards")) {
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              aborted.push(url);
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }

        return Response.json({
          provenance: { window: { from: "2026-09-21", to: "2026-10-21" } },
          decks: { items: [deck("a", 0.2), deck("b", 0.1)] },
        });
      }),
    );

    let settled = false;
    const pending = staples.fetch(request(MAIN_30D)).then((response) => {
      settled = true;
      return response;
    });
    await vi.advanceTimersByTimeAsync(49_999);

    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;

    expect(aborted).toHaveLength(2);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    [
      "times out",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
    [
      "answers with a body that is not JSON",
      async (): Promise<Response> => new Response("<html>"),
    ],
  ])("answers 502 when Endstep %s", async (_, answer) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(answer));

    const response = await staples.fetch(request(MAIN_30D));

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
