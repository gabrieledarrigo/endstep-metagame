import {
  BASE_HEADERS,
  EDGE_CACHE,
  SCRYFALL_CDN,
  SCRYFALL_HEADERS,
  SEGMENT,
  TIMEOUT_MS,
  WINDOWS,
  cacheControl,
  deckDetailUrl,
  errorResponse,
  frontOf,
  isRecord,
  methodResponse,
} from "./_shared.js";

const RATE_LIMIT_SECONDS = 60;
const SUCCESS_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
const MEMORY_MS = 3_600_000;
const SCRYFALL = "https://api.scryfall.com/";
const COLLECTION = `${SCRYFALL}cards/collection`;
const SEARCH = `${SCRYFALL}cards/search`;
const COLLECTION_LIMIT = 75;
const QUERY_LIMIT = 1000;
const PRICED = "(usd>0 or eur>0 or tix>0)";
const MAX_REQUESTS = 5;
const SPACING_MS = 500;
const BOUND_MS = 6000;
const PAUSE_MS = 30_000;
const BASICS = ["plains", "island", "swamp", "mountain", "forest", "wastes"];
const NO_PRICES: Prices = { tix: null, eur: null, usd: null };
const FREE: Prices = { tix: 0, eur: 0, usd: 0 };

type Target = { slug: string; window: string };

type Prices = { tix: number | null; eur: number | null; usd: number | null };

type Remembered<Value> = { value: Value; at: number };

type Budget = { left: number; deadline: number };

type Answer = { status: number; body: unknown };

type ScryfallCard = {
  name: string;
  image_uris?: unknown;
  prices?: unknown;
  card_faces?: { name: string; image_uris?: unknown }[];
};

type Chunk = { query: string; keys: string[] };

const images = new Map<string, Remembered<string | null>>();
const prices = new Map<string, Remembered<Prices>>();
let pausedUntil = 0;
let nextSlot = 0;

class UpstreamError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The deck detail answered ${status}`);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function targetOf(search: string): Target | null {
  const match = /^\?deck=([^&]*)&window=([^&]*)$/.exec(search);

  if (!match || !SEGMENT.test(match[1]) || !WINDOWS.includes(match[2])) {
    return null;
  }

  return { slug: match[1], window: match[2] };
}

function keyOf(name: string): string {
  return name.toLowerCase();
}

function isBasic(key: string): boolean {
  return BASICS.includes(key);
}

function isNamed(value: unknown): value is { name: string } {
  return isRecord(value) && typeof value.name === "string";
}

function namesOf(body: unknown): string[] | null {
  if (!isRecord(body) || !isRecord(body.sampleList)) {
    throw new Error("The deck detail has no sample list");
  }

  const { state, main, side } = body.sampleList;

  if (
    typeof state !== "string" ||
    !Array.isArray(main) ||
    !Array.isArray(side) ||
    !main.every(isNamed) ||
    !side.every(isNamed)
  ) {
    throw new Error("The deck detail has an unreadable sample list");
  }

  if (state === "withheld") {
    return null;
  }

  const cards = state === "mainOnly" ? main : [...main, ...side];
  const names = cards
    .map((card) => card.name)
    .filter((name) => name.trim() !== "");

  return [...new Set(names)];
}

async function listedNames(
  origin: string,
  target: Target,
): Promise<string[] | null> {
  const response = await fetch(
    deckDetailUrl(origin, target.slug, target.window),
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError(response.status);
  }

  return namesOf(await response.json());
}

function recall<Value>(
  memory: Map<string, Remembered<Value>>,
  key: string,
): Remembered<Value> | undefined {
  const entry = memory.get(key);

  if (!entry || Date.now() - entry.at >= MEMORY_MS) {
    return undefined;
  }

  return entry;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ask(
  budget: Budget,
  url: string,
  init: RequestInit,
): Promise<Answer | null> {
  if (budget.left === 0 || Date.now() < pausedUntil) {
    return null;
  }

  const start = Math.max(Date.now(), nextSlot);

  if (start >= budget.deadline) {
    return null;
  }

  budget.left -= 1;
  nextSlot = start + SPACING_MS;

  if (start > Date.now()) {
    await wait(start - Date.now());
  }

  if (Date.now() < pausedUntil) {
    return null;
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers: SCRYFALL_HEADERS,
      signal: AbortSignal.timeout(budget.deadline - Date.now()),
    });

    if (response.status === 429) {
      pausedUntil = Date.now() + PAUSE_MS;
    }

    if (!response.ok) {
      await response.body?.cancel();
      return { status: response.status, body: null };
    }

    return { status: response.status, body: await response.json() };
  } catch {
    return null;
  }
}

function isScryfallCard(value: unknown): value is ScryfallCard {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  const faces = value.card_faces;

  return faces === undefined || (Array.isArray(faces) && faces.every(isNamed));
}

function cardsOf(body: unknown): ScryfallCard[] | null {
  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !body.data.every(isScryfallCard)
  ) {
    return null;
  }

  return body.data;
}

function cardNames(card: ScryfallCard): string[] {
  return [card.name, ...(card.card_faces ?? []).map((face) => face.name)];
}

function normalOf(imageUris: unknown): string | undefined {
  if (!isRecord(imageUris) || typeof imageUris.normal !== "string") {
    return undefined;
  }

  return imageUris.normal;
}

function imageOf(card: ScryfallCard): string | null {
  const address =
    normalOf(card.image_uris) ?? normalOf(card.card_faces?.[0]?.image_uris);

  if (!address?.startsWith(SCRYFALL_CDN)) {
    return null;
  }

  return address;
}

async function lookUpImages(budget: Budget, names: string[]): Promise<void> {
  const missing = names
    .filter((name) => !recall(images, keyOf(name)))
    .slice(0, COLLECTION_LIMIT);

  if (missing.length === 0) {
    return;
  }

  const answer = await ask(budget, COLLECTION, {
    method: "POST",
    body: JSON.stringify({
      identifiers: missing.map((name) => ({ name: frontOf(name) })),
    }),
  });

  if (!answer || answer.status !== 200) {
    return;
  }

  const cards = cardsOf(answer.body);

  if (!cards) {
    return;
  }

  const found = new Map<string, string | null>();

  for (const card of cards) {
    const image = imageOf(card);

    for (const name of cardNames(card)) {
      if (!found.get(keyOf(name))) {
        found.set(keyOf(name), image);
      }
    }
  }

  const at = Date.now();

  for (const name of missing) {
    images.set(keyOf(name), { value: found.get(keyOf(name)) ?? null, at });
  }
}

function queryOf(terms: string[]): string {
  return `(${terms.join(" or ")}) ${PRICED}`;
}

function chunksOf(names: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let terms: string[] = [];
  let keys: string[] = [];

  for (const name of names) {
    const term = `!"${name}"`;

    if (terms.length > 0 && queryOf([...terms, term]).length >= QUERY_LIMIT) {
      chunks.push({ query: queryOf(terms), keys });
      terms = [];
      keys = [];
    }

    terms = [...terms, term];
    keys = [...keys, keyOf(name)];
  }

  if (terms.length > 0) {
    chunks.push({ query: queryOf(terms), keys });
  }

  return chunks;
}

function nextPageOf(body: unknown): string | null | undefined {
  if (!isRecord(body) || body.has_more !== true) {
    return null;
  }

  if (
    typeof body.next_page !== "string" ||
    !body.next_page.startsWith(SCRYFALL)
  ) {
    return undefined;
  }

  return body.next_page;
}

function priceOf(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const price = Number(value);

  if (!Number.isFinite(price)) {
    return null;
  }

  return price;
}

function lowest(current: number | null, price: number | null): number | null {
  if (price === null) {
    return current;
  }

  if (current === null) {
    return price;
  }

  return Math.min(current, price);
}

function withPrinting(current: Prices, card: ScryfallCard): Prices {
  const listed = isRecord(card.prices) ? card.prices : {};

  return {
    tix: lowest(current.tix, priceOf(listed.tix)),
    eur: lowest(current.eur, priceOf(listed.eur)),
    usd: lowest(current.usd, priceOf(listed.usd)),
  };
}

function matchedKey(card: ScryfallCard, keys: string[]): string | null {
  return (
    cardNames(card)
      .map(keyOf)
      .find((key) => keys.includes(key)) ?? null
  );
}

async function searchChunk(
  budget: Budget,
  chunk: Chunk,
): Promise<Map<string, Prices>> {
  const done = new Map<string, Prices>();
  const seen = new Map<string, Prices>();
  let current: string | null = null;
  let first = true;
  let url: string | null = `${SEARCH}?${new URLSearchParams({
    unique: "prints",
    order: "name",
    q: chunk.query,
  })}`;

  while (url !== null) {
    const answer = await ask(budget, url, { method: "GET" });

    if (!answer) {
      return done;
    }

    if (answer.status === 404 && first) {
      return new Map(chunk.keys.map((key) => [key, NO_PRICES]));
    }

    const page = answer.status === 200 ? cardsOf(answer.body) : null;
    const next = nextPageOf(answer.body);

    if (!page || next === undefined) {
      return done;
    }

    for (const card of page) {
      const key = matchedKey(card, chunk.keys);

      if (current !== null && key !== current) {
        done.set(current, seen.get(current) ?? NO_PRICES);
      }

      if (key !== null) {
        seen.set(key, withPrinting(seen.get(key) ?? NO_PRICES, card));
      }

      current = key;
    }

    first = false;
    url = next;
  }

  return new Map(chunk.keys.map((key) => [key, seen.get(key) ?? NO_PRICES]));
}

async function lookUpPrices(budget: Budget, names: string[]): Promise<void> {
  const missing = names.filter(
    (name) => !isBasic(keyOf(name)) && !recall(prices, keyOf(name)),
  );

  for (const name of missing.filter((name) => name.includes('"'))) {
    prices.set(keyOf(name), { value: NO_PRICES, at: Date.now() });
  }

  const chunks = chunksOf(missing.filter((name) => !name.includes('"')));

  for (const chunk of chunks) {
    const done = await searchChunk(budget, chunk);
    const at = Date.now();

    for (const [key, value] of done) {
      prices.set(key, { value, at });
    }
  }
}

function pricesOf(key: string): Prices | undefined {
  if (isBasic(key)) {
    return FREE;
  }

  return recall(prices, key)?.value;
}

function jsonResponse(method: string, body: unknown, cache: string): Response {
  return new Response(method === "HEAD" ? null : JSON.stringify(body), {
    headers: { ...BASE_HEADERS, "Cache-Control": cache },
    status: 200,
  });
}

export default {
  /**
   * Returns the card images and the prices of one deck's sample list, from Scryfall, §4.10.
   *
   * The query string must be exactly `?deck=` and a slug the proxy accepts, then `&window=` and one of the five windows. The function reads the deck detail through our own proxy, at the deck page's address, then asks Scryfall for the names it has not seen in the last hour: one collection request for the images, then searches in name order over every priced printing for the lowest price in tix, euros and dollars. A name's price is kept once its printings end, so a call cut short keeps the names it finished and the next call asks only for the rest. The six basic lands cost nothing and are not searched. Scryfall gets at most five requests per call, at least 500ms apart, within a shared bound of 6 seconds. GET and HEAD build the response. OPTIONS answers the CORS preflight with 204.
   *
   * @param req - The incoming request.
   * @returns A Promise resolving to `{ cards: { [name]: { imageUrl, tix, eur, usd } } }`, cached for an hour with a day of stale-while-revalidate, or for five minutes when a lookup failed, ran out of time or was left out by the cap, or when the list is withheld. Otherwise a JSON error: 400 for any other query string, 405 for any other method, 404 for an unknown deck, 429 when the deck detail is rate limited, cached for 60 seconds, and 502 when the deck detail fails in any other way.
   * @see https://scryfall.com/docs/api/cards/collection
   * @see https://scryfall.com/docs/api/cards/search
   */
  fetch: async function handler(req: Request): Promise<Response> {
    const refused = methodResponse(req);

    if (refused) {
      return refused;
    }

    const url = new URL(req.url);
    const target = targetOf(url.search);

    if (!target) {
      return errorResponse(400, "Unsupported sample cards query");
    }

    let names;

    try {
      names = await listedNames(url.origin, target);
    } catch (error) {
      if (error instanceof UpstreamError && error.status === 404) {
        return errorResponse(404, "Unknown deck");
      }

      if (error instanceof UpstreamError && error.status === 429) {
        return errorResponse(429, "Endstep's rate limit was reached", {
          "Cache-Control": cacheControl(429, RATE_LIMIT_SECONDS),
        });
      }

      return errorResponse(502, "The deck detail could not be read");
    }

    if (names === null) {
      return jsonResponse(req.method, { cards: {} }, EDGE_CACHE);
    }

    const budget = { left: MAX_REQUESTS, deadline: Date.now() + BOUND_MS };

    await lookUpImages(budget, names);
    await lookUpPrices(budget, names);

    const complete = names.every(
      (name) => recall(images, keyOf(name)) && pricesOf(keyOf(name)),
    );
    const cards = names.map((name) => [
      name,
      {
        imageUrl: recall(images, keyOf(name))?.value ?? null,
        ...(pricesOf(keyOf(name)) ?? NO_PRICES),
      },
    ]);

    return jsonResponse(
      req.method,
      { cards: Object.fromEntries(cards) },
      complete ? SUCCESS_CACHE : EDGE_CACHE,
    );
  },
};
