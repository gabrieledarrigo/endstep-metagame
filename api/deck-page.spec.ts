import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import vercel from "../vercel.json" with { type: "json" };
import { WINDOWS } from "./_shared.js";

const source = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const readFile = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({ readFile }));

const ORIGIN = "https://pauper-endstep-metagame.vercel.app";
const DEPLOYMENT = "https://pauper-endstep-metagame-git-109.vercel.app";
const SITE_CARD = `${ORIGIN}/site-card.png`;
const DESCRIPTION =
  "Which Pauper decks are played, how they perform, and how they do against each other.";
const ART =
  "https://cards.scryfall.io/art_crop/front/6/3/6338942d-d650-4571-8ec6-4d658792c53e.jpg?1783923877";
const FIVE_MINUTES = "public, s-maxage=300, stale-while-revalidate=600";
const ONE_MINUTE = "public, s-maxage=60, stale-while-revalidate=600";

type DeckPage = (typeof import("./deck-page"))["default"];

type DeckFields = {
  slug: string;
  name: string;
  share: { rate: number };
  players: number;
  matchWinRate: {
    wins: number;
    losses: number;
    rate: number | null;
    low: number | null;
    high: number | null;
    gate?: string | null;
  };
  art: { cardName: string; imageUrl?: string };
};

let deckPage: DeckPage;

beforeEach(async () => {
  vi.resetModules();
  readFile.mockReset();
  readFile.mockResolvedValue(source);
  deckPage = (await import("./deck-page")).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deck(overrides: Partial<DeckFields> = {}): DeckFields {
  return {
    slug: "affinity-e93f5f74",
    name: "Affinity",
    share: { rate: 0.0957 },
    players: 1204,
    matchWinRate: {
      wins: 2200,
      losses: 2000,
      rate: 0.5238,
      low: 0.509,
      high: 0.538,
    },
    art: { cardName: "Thoughtcast", imageUrl: ART },
    ...overrides,
  };
}

function proxy(
  body: unknown,
  status = 200,
  cache = "public",
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": cache },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(query: string, method = "GET"): Request {
  return new Request(`${DEPLOYMENT}/api/deck-page?${query}`, { method });
}

function meta(html: string, attribute: string, value: string): string[] {
  const tag = new RegExp(
    `<meta\\b[^>]*\\b${attribute}="${value}"[^>]*\\bcontent="([^"]*)"`,
    "g",
  );

  return [...html.matchAll(tag)].map(([, content]) => content);
}

function title(html: string): string[] {
  return [...html.matchAll(/<title>([^<]*)<\/title>/g)].map(([, text]) => text);
}

function canonical(html: string): string[] {
  return [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map(
    ([, href]) => href,
  );
}

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes]) => !/(^|\s)src\s*=/i.test(attributes))
    .map(([, , body]) => body);
}

function expectSiteCard(html: string): void {
  expect(html).toBe(source);
  expect(meta(html, "property", "og:image")).toEqual([SITE_CARD]);
  expect(meta(html, "name", "description")).toEqual([DESCRIPTION]);
  expect(canonical(html)).toEqual([]);
}

describe("deck-page", () => {
  it("reads the built index.html from the files deployed with it", async () => {
    proxy({ deck: deck() });

    await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(readFile).toHaveBeenCalledWith(
      join(process.cwd(), "dist", "index.html"),
      "utf8",
    );
  });

  it("fetches the deck detail through the proxy at the deck page's own address", async () => {
    const fetchMock = proxy({ deck: deck() });

    await deckPage.fetch(request("slug=affinity-e93f5f74&window=7d"));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${DEPLOYMENT}/api/metagame/Pauper/decks/affinity-e93f5f74?window=7d&population=rated`,
    );
  });

  it("asks for 30 days when the link names no window", async () => {
    const fetchMock = proxy({ deck: deck() });

    await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${DEPLOYMENT}/api/metagame/Pauper/decks/affinity-e93f5f74?window=30d&population=rated`,
    );
  });

  it("writes the deck's title, description, art, canonical link and og:url", async () => {
    proxy({ deck: deck() });

    const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));
    const html = await response.text();
    const text =
      "9.6% of the Pauper field over the last 30 days, 52.4% match win rate, 1,204 players.";

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(title(html)).toEqual(["Affinity · Pauper Endstep metagame"]);
    expect(meta(html, "name", "description")).toEqual([text]);
    expect(meta(html, "property", "og:title")).toEqual([
      "Affinity · Pauper Endstep metagame",
    ]);
    expect(meta(html, "property", "og:description")).toEqual([text]);
    expect(meta(html, "property", "og:image")).toEqual([ART]);
    expect(canonical(html)).toEqual([`${ORIGIN}/decks/affinity-e93f5f74`]);
    expect(meta(html, "property", "og:url")).toEqual([
      `${ORIGIN}/decks/affinity-e93f5f74`,
    ]);
  });

  it("keeps the site name, the card type and the theme colours", async () => {
    proxy({ deck: deck() });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();

    expect(meta(html, "property", "og:site_name")).toEqual([
      "Pauper Endstep metagame",
    ]);
    expect(meta(html, "property", "og:type")).toEqual(["website"]);
    expect(meta(html, "name", "twitter:card")).toEqual(["summary_large_image"]);
    expect(meta(html, "name", "theme-color")).toEqual(["#f9f9f7", "#353537"]);
  });

  it("keeps the theme script byte for byte, so its hash still matches the policy", async () => {
    proxy({ deck: deck({ name: "Script <script>alert(1)</script>" }) });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();
    const policy = vercel.headers
      .flatMap((rule) => rule.headers)
      .find(({ key }) => key === "Content-Security-Policy");
    const scripts = inlineScripts(html);

    expect(scripts).toEqual(inlineScripts(source));
    expect(policy?.value).toContain(
      `'sha256-${createHash("sha256").update(scripts[0]).digest("base64")}'`,
    );
  });

  it("keeps the built page's own scripts, so the app still boots", async () => {
    readFile.mockResolvedValue(
      source.replace(
        "</head>",
        '<script type="module" crossorigin src="/assets/index-abc.js"></script>\n</head>',
      ),
    );
    proxy({ deck: deck() });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();

    expect(html).toContain(
      '<script type="module" crossorigin src="/assets/index-abc.js"></script>',
    );
    expect(html).toContain('<div id="root"></div>');
  });

  it("takes the canonical link from the deck's current slug, not a stale one", async () => {
    proxy({ deck: deck({ slug: "affinity-e93f5f74" }) });

    const html = await (
      await deckPage.fetch(request("slug=renamed-e93f5f74&window=7d"))
    ).text();

    expect(canonical(html)).toEqual([`${ORIGIN}/decks/affinity-e93f5f74`]);
    expect(meta(html, "property", "og:url")).toEqual([
      `${ORIGIN}/decks/affinity-e93f5f74`,
    ]);
  });

  it.each([
    ["1d", "over the last day"],
    ["7d", "over the last 7 days"],
    ["14d", "over the last 14 days"],
    ["30d", "over the last 30 days"],
    ["season", "this season"],
  ])("names the period of the %s window", async (timeWindow, period) => {
    proxy({ deck: deck() });

    const html = await (
      await deckPage.fetch(
        request(`slug=affinity-e93f5f74&window=${timeWindow}`),
      )
    ).text();

    expect(meta(html, "property", "og:description")[0]).toBe(
      `9.6% of the Pauper field ${period}, 52.4% match win rate, 1,204 players.`,
    );
  });

  it.each(WINDOWS)(
    "names a period for every window the functions share, %s",
    async (timeWindow) => {
      proxy({ deck: deck() });

      const html = await (
        await deckPage.fetch(
          request(`slug=affinity-e93f5f74&window=${timeWindow}`),
        )
      ).text();
      const [text] = meta(html, "property", "og:description");

      expect(text).toMatch(/^9\.6% of the Pauper field (over the last|this) /);
      expect(text).not.toContain("undefined");
    },
  );

  it.each([
    [
      "under 20 decided matches",
      { wins: 10, losses: 9, rate: 0.53, low: 0.3, high: 0.75 },
    ],
    ["no rate", { wins: 30, losses: 20, rate: null, low: null, high: null }],
    ["no range", { wins: 20, losses: 10, rate: 0.67, low: null, high: null }],
    ["no low end", { wins: 20, losses: 10, rate: 0.67, low: null, high: 0.8 }],
    ["no high end", { wins: 20, losses: 10, rate: 0.67, low: 0.5, high: null }],
    [
      "a gate",
      {
        wins: 20,
        losses: 10,
        rate: 0.67,
        low: 0.5,
        high: 0.8,
        gate: "too_few",
      },
    ],
  ])(
    "reads a win rate with %s as too few to call, as the deck page does",
    async (_, matchWinRate) => {
      proxy({ deck: deck({ matchWinRate }) });

      const html = await (
        await deckPage.fetch(request("slug=affinity-e93f5f74"))
      ).text();

      expect(meta(html, "property", "og:description")[0]).toBe(
        "9.6% of the Pauper field over the last 30 days, match win rate too few to call, 1,204 players.",
      );
    },
  );

  it("reads a tiny share as under 0.1% and one player in the singular", async () => {
    proxy({ deck: deck({ share: { rate: 0.0002 }, players: 1 }) });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();

    expect(meta(html, "property", "og:description")[0]).toBe(
      "<0.1% of the Pauper field over the last 30 days, 52.4% match win rate, 1 player.".replace(
        "<",
        "&lt;",
      ),
    );
  });

  it("escapes the deck's name in the title and the tags", async () => {
    proxy({ deck: deck({ name: `Tom & "Jerry's" <b>$& $' $1` }) });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();
    const escaped =
      "Tom &amp; &quot;Jerry&#39;s&quot; &lt;b&gt;$&amp; $&#39; $1 · Pauper Endstep metagame";

    expect(title(html)).toEqual([escaped]);
    expect(meta(html, "property", "og:title")).toEqual([escaped]);
    expect(html).not.toContain("<b>");
  });

  it("falls back to Endstep's art crop, with the card name encoded, when the art address is missing", async () => {
    proxy({ deck: deck({ art: { cardName: `Fire // Ice & "Co"` } }) });

    const html = await (
      await deckPage.fetch(request("slug=affinity-e93f5f74"))
    ).text();

    expect(meta(html, "property", "og:image")).toEqual([
      "https://endstep.cc/api/cards/image?name=Fire+%2F%2F+Ice+%26+%22Co%22&amp;version=art_crop",
    ]);
  });

  it.each([FIVE_MINUTES, ONE_MINUTE, "public"])(
    "caches a preview whose art resolved for five minutes, whatever the proxy sent (%s)",
    async (cache) => {
      proxy({ deck: deck() }, 200, cache);

      const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

      expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    },
  );

  it.each([FIVE_MINUTES, ONE_MINUTE, "public"])(
    "caches a preview whose art fell back for one minute, whatever the proxy sent (%s)",
    async (cache) => {
      proxy({ deck: deck({ art: { cardName: "Thoughtcast" } }) }, 200, cache);

      const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

      expect(response.headers.get("cache-control")).toBe(ONE_MINUTE);
    },
  );

  it.each([
    ["no slug", "window=30d"],
    ["a slug the proxy refuses", "slug=affinity.e93f5f74"],
    ["an encoded slug", "slug=..%2Fformats"],
    ["two slugs", "slug=affinity-e93f5f74&slug=elves-12345678"],
    ["an unknown window", "slug=affinity-e93f5f74&window=zz"],
    ["an empty window", "slug=affinity-e93f5f74&window="],
    ["two windows", "slug=affinity-e93f5f74&window=7d&window=30d"],
  ])(
    "serves the site card with no-store and no call for %s",
    async (_, query) => {
      const fetchMock = proxy({ deck: deck() });

      const response = await deckPage.fetch(request(query));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expectSiteCard(await response.text());
    },
  );

  it("ignores the link's other parameters", async () => {
    const fetchMock = proxy({ deck: deck() });

    const response = await deckPage.fetch(
      request("slug=affinity-e93f5f74&window=7d&fbclid=abc&utm_source=x"),
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${DEPLOYMENT}/api/metagame/Pauper/decks/affinity-e93f5f74?window=7d&population=rated`,
    );
    expect(meta(await response.text(), "property", "og:image")).toEqual([ART]);
  });

  it.each([
    ["an unknown deck", { error: "Unknown deck" }, 404],
    ["a rate limit", { error: "Too many requests" }, 429],
    ["an unreachable Endstep", { error: "Endstep is unreachable" }, 502],
    ["a failed status, whatever its body", { deck: deck() }, 404],
    ["a body without a deck", { provenance: {} }, 200],
    ["a deck without a name", { deck: deck({ name: undefined }) }, 200],
    ["a deck with a bad slug", { deck: deck({ slug: "a/b" }) }, 200],
    [
      "a share that is not a number",
      { deck: { ...deck(), share: { rate: "9.6%" } } },
      200,
    ],
  ])("serves the site card with no-store for %s", async (_, body, status) => {
    proxy(body, status);

    const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expectSiteCard(await response.text());
  });

  it("serves the site card with no-store when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response("<html>", { status: 200 })),
    );

    const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(response.headers.get("cache-control")).toBe("no-store");
    expectSiteCard(await response.text());
  });

  it("bounds the call at two seconds, and serves the site card with no-store when it times out", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(timeout.mock.calls).toEqual([[2000]]);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(
      timeout.mock.results[0].value,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expectSiteCard(await response.text());
  });

  it("sends nothing from the reader's request to the proxy", async () => {
    const fetchMock = proxy({ deck: deck() });

    await deckPage.fetch(
      new Request(`${DEPLOYMENT}/api/deck-page?slug=affinity-e93f5f74`, {
        headers: { cookie: "a=b", "user-agent": "Reader" },
      }),
    );

    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      accept: "application/json",
    });
  });

  it("answers HEAD with the same headers and no body", async () => {
    proxy({ deck: deck() });

    const response = await deckPage.fetch(
      request("slug=affinity-e93f5f74", "HEAD"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(FIVE_MINUTES);
    expect(response.body).toBeNull();
  });

  it.each(["POST", "PUT", "DELETE", "OPTIONS"])(
    "refuses %s with 405",
    async (method) => {
      const fetchMock = proxy({ deck: deck() });

      const response = await deckPage.fetch(
        request("slug=affinity-e93f5f74", method),
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, HEAD");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("reads index.html again after a failed read", async () => {
    proxy({ deck: deck() });
    readFile.mockRejectedValueOnce(new Error("EMFILE: too many open files"));

    await expect(
      deckPage.fetch(request("slug=affinity-e93f5f74")),
    ).rejects.toThrow("EMFILE");
    const response = await deckPage.fetch(request("slug=affinity-e93f5f74"));

    expect(response.status).toBe(200);
    expect(title(await response.text())).toEqual([
      "Affinity · Pauper Endstep metagame",
    ]);
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it("reads index.html once per instance", async () => {
    proxy({ deck: deck() });

    await deckPage.fetch(request("slug=affinity-e93f5f74"));
    await deckPage.fetch(request("slug=affinity-e93f5f74&window=7d"));

    expect(readFile).toHaveBeenCalledOnce();
  });
});
