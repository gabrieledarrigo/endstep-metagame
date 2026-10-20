import {
  BASE_HEADERS,
  EDGE_CACHE,
  WINDOWS,
  cacheControl,
  errorResponse,
  findArt,
  isRateLimit,
  methodResponse,
  upstream,
} from "./_shared.js";

const RATE_LIMIT_SECONDS = 60;
const ART_BOUND_MS = 3000;
const SUCCESS_CACHE = "public, s-maxage=1800, stale-while-revalidate=1800";
const QUERY = /^\?window=([^&]*)&section=(main|side)$/;
const TOP_DECKS = 24;
const PAGE_SIZE = 50;
const MAX_PAGES = 4;
const FLOOR = 0.05;
const KEPT = 50;
const BASICS = [
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
  "snow-covered wastes",
];

type Target = { window: string; section: string };

type UpstreamDeck = { slug: string; name: string; share: { rate: number } };

type DecksBody = {
  provenance: { window: { from: string; to: string } };
  decks: { items: UpstreamDeck[] };
};

type CardRow = {
  name: string;
  playRate: { rate: number };
  averageCopies: number;
};

type CardsBody = {
  withheld: unknown;
  cards: { items: CardRow[]; total: number };
};

type Table = { deck: UpstreamDeck; cards: CardRow[] | null };

type CountedTable = { deck: UpstreamDeck; cards: CardRow[] };

type StapleDeck = {
  slug: string;
  name: string;
  playRate: number;
  copies: number;
};

type Tally = {
  name: string;
  weight: number;
  copies: number;
  decks: StapleDeck[];
};

type Staple = {
  name: string;
  share: number;
  copies: number;
  decks: StapleDeck[];
};

type Staples = {
  window: { from: string; to: string };
  section: string;
  withheld: number;
  cards: (Staple & { art: { imageUrl: string } | null })[];
};

function targetOf(search: string): Target | null {
  const match = QUERY.exec(search);

  if (!match || !WINDOWS.includes(match[1])) {
    return null;
  }

  return { window: match[1], section: match[2] };
}

async function tableOf(deck: UpstreamDeck, target: Target): Promise<Table> {
  const cards: CardRow[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await upstream<CardsBody>(
      `Pauper/decks/${encodeURIComponent(deck.slug)}/cards`,
      {
        window: target.window,
        population: "rated",
        section: target.section,
        pageSize: String(PAGE_SIZE),
        page: String(page),
      },
    );

    if (body.withheld !== null) {
      return { deck, cards: null };
    }

    cards.push(...body.cards.items);
    const last = body.cards.items.at(-1);

    if (
      !last ||
      last.playRate.rate < FLOOR ||
      page * PAGE_SIZE >= body.cards.total
    ) {
      break;
    }
  }

  return { deck, cards };
}

function staplesOf(tables: Table[]): Staple[] {
  const counted = tables.filter(
    (table): table is CountedTable => table.cards !== null,
  );
  const total = counted.reduce((sum, table) => sum + table.deck.share.rate, 0);
  const tallies = new Map<string, Tally>();

  for (const { deck, cards } of counted) {
    for (const card of cards) {
      if (BASICS.includes(card.name.toLowerCase())) {
        continue;
      }

      const weight = deck.share.rate * card.playRate.rate;
      const tally = tallies.get(card.name) ?? {
        name: card.name,
        weight: 0,
        copies: 0,
        decks: [],
      };

      tally.weight += weight;
      tally.copies += weight * card.averageCopies;

      if (card.playRate.rate >= FLOOR) {
        tally.decks.push({
          slug: deck.slug,
          name: deck.name,
          playRate: card.playRate.rate,
          copies: card.averageCopies,
        });
      }

      tallies.set(card.name, tally);
    }
  }

  return [...tallies.values()]
    .map((tally) => ({
      name: tally.name,
      share: tally.weight / total,
      copies: tally.copies / tally.weight,
      decks: tally.decks.toSorted((a, b) => b.playRate - a.playRate),
    }))
    .toSorted(
      (a, b) => b.share - a.share || a.name.localeCompare(b.name, "en-GB"),
    )
    .slice(0, KEPT);
}

async function build(
  target: Target,
): Promise<{ staples: Staples; complete: boolean }> {
  const top = await upstream<DecksBody>("Pauper/decks", {
    window: target.window,
    population: "rated",
    sort: "share",
    dir: "desc",
    pageSize: String(TOP_DECKS),
  });

  const results = await Promise.allSettled(
    top.decks.items.map((deck) => tableOf(deck, target)),
  );
  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  if (failures.length > 0) {
    throw failures.find(isRateLimit) ?? failures[0];
  }

  const tables = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const staples = staplesOf(tables);
  const { art, complete } = await findArt(
    staples.map((card) => card.name),
    ART_BOUND_MS,
  );

  return {
    staples: {
      window: {
        from: top.provenance.window.from,
        to: top.provenance.window.to,
      },
      section: target.section,
      withheld: tables.filter((table) => table.cards === null).length,
      cards: staples.map((card) => {
        const imageUrl = art.get(card.name);

        return {
          name: card.name,
          share: card.share,
          copies: card.copies,
          art: imageUrl ? { imageUrl } : null,
          decks: card.decks,
        };
      }),
    },
    complete,
  };
}

export default {
  /**
   * Builds the 50 cards the top 24 decks play most, weighted by each deck's share, for the main deck or the sideboard, §4.9.
   *
   * The query string must be exactly `?window=` and one of the five windows, then `&section=` and `main` or `side`. The function reads the top 24 decks, then each deck's card table in pages of 50, all decks in parallel. It reads a deck's next page while that page's last card is in at least 5% of the deck's lists, up to 4 pages. It leaves out withheld decks and the basic lands, and adds each card's art from Scryfall. GET and HEAD build the response. OPTIONS answers the CORS preflight with 204.
   *
   * @param req - The incoming request.
   * @returns A Promise resolving to `{ window, section, withheld, cards }`, cached for 30 minutes with 30 more of stale-while-revalidate, or for five minutes when the art lookup failed. Otherwise a JSON error: 400 for any other query string, 405 for any other method, 429 when Endstep rate limits a call, cached for 60 seconds, and 502 when any other call fails.
   * @see https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard
   */
  fetch: async function handler(req: Request): Promise<Response> {
    const refused = methodResponse(req);

    if (refused) {
      return refused;
    }

    const target = targetOf(new URL(req.url).search);

    if (!target) {
      return errorResponse(400, "Unsupported staples query");
    }

    let built;

    try {
      built = await build(target);
    } catch (error) {
      if (isRateLimit(error)) {
        return errorResponse(429, "Endstep's rate limit was reached", {
          "Cache-Control": cacheControl(429, RATE_LIMIT_SECONDS),
        });
      }

      return errorResponse(502, "Endstep did not answer every call");
    }

    return new Response(
      req.method === "HEAD" ? null : JSON.stringify(built.staples),
      {
        headers: {
          ...BASE_HEADERS,
          "Cache-Control": built.complete ? SUCCESS_CACHE : EDGE_CACHE,
        },
        status: 200,
      },
    );
  },
};
