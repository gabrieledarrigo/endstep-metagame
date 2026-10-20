export const UPSTREAM = "https://endstep.cc/api/metagame/v1";
export const TIMEOUT_MS = 8000;
export const SEGMENT = /^[A-Za-z0-9_-]+$/;
export const WINDOWS = ["1d", "7d", "14d", "30d", "season"];
export const EDGE_CACHE = "public, s-maxage=300, stale-while-revalidate=600";
export const PARTIAL_ART_CACHE =
  "public, s-maxage=60, stale-while-revalidate=600";
export const SCRYFALL_CDN = "https://cards.scryfall.io/";
export const SCRYFALL_HEADERS: Readonly<Record<string, string>> = {
  "User-Agent":
    "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)",
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const NO_BODY = [204, 205, 304];
const SCRYFALL_COLLECTION = "https://api.scryfall.com/cards/collection";
const SCRYFALL_TIMEOUT_MS = 1000;
const SCRYFALL_PAUSE_MS = 30_000;

type ScryfallImages = { art_crop?: string };

type ScryfallFace = { name: string; image_uris?: ScryfallImages };

type ScryfallCard = ScryfallFace & { card_faces?: ScryfallFace[] };

const artByName = new Map<string, string | null>();
let pausedUntil = 0;

/**
 * Builds the address of a deck detail on our own proxy, exactly as the deck page requests it, so every caller shares the deck page's edge cache entry.
 *
 * @param origin - The site's origin, such as `https://pauper-endstep-metagame.vercel.app`.
 * @param slug - The deck's slug.
 * @param timeWindow - One of the five windows.
 * @returns The proxy's address of the deck detail, with the window and the `rated` population, in the order the deck page sends them.
 */
export function deckDetailUrl(
  origin: string,
  slug: string,
  timeWindow: string,
): string {
  const query = new URLSearchParams({
    window: timeWindow,
    population: "rated",
  });

  return `${origin}/api/metagame/Pauper/decks/${encodeURIComponent(slug)}?${query}`;
}

/**
 * Checks whether a status forbids a response body.
 *
 * @param status - An HTTP status.
 * @returns `true` for 204, 205 and 304.
 */
export function hasNoBody(status: number): boolean {
  return NO_BODY.includes(status);
}

/**
 * Checks whether a value is a non-null object, so its properties can be read. Arrays count.
 *
 * @param value - Any parsed JSON value.
 * @returns `true` for any object that is not `null`, arrays included.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Builds a JSON error response.
 *
 * @param status - The HTTP status to answer with.
 * @param message - The text of the `error` field.
 * @param headers - Extra headers, which override the base ones.
 * @returns A Response with the CORS headers and `Cache-Control: no-store`, unless `headers` sets another `Cache-Control`.
 */
export function errorResponse(
  status: number,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...BASE_HEADERS, ...headers },
    status,
  });
}

/**
 * Applies the method rules of §4.3: GET and HEAD go through, OPTIONS answers the CORS preflight, and anything else is refused.
 *
 * @param req - The incoming request.
 * @returns A 204 for OPTIONS, a 405 for any method other than GET or HEAD, or `null` when the handler should go on.
 */
export function methodResponse(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...BASE_HEADERS,
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return errorResponse(405, "Method not allowed", {
      Allow: "GET, HEAD, OPTIONS",
    });
  }

  return null;
}

/**
 * Selects the `Cache-Control` header for a response with the given status.
 *
 * @param status - The HTTP status of the response.
 * @param rateLimitSeconds - How long the edge holds a 429.
 * @returns Five minutes at the edge for a success with a body, `rateLimitSeconds` for a rate limit, and no caching otherwise.
 */
export function cacheControl(status: number, rateLimitSeconds: number): string {
  if (status < 400 && !hasNoBody(status)) {
    return EDGE_CACHE;
  }

  if (status === 429) {
    return `public, s-maxage=${rateLimitSeconds}`;
  }

  return "no-store";
}

/**
 * Builds the memory key of a card name. Scryfall matches names ignoring case, §3.4.
 *
 * @param name - A card name, or one face's name.
 * @returns The name in lower case.
 */
function nameKey(name: string): string {
  return name.toLowerCase();
}

/**
 * Checks whether a value is a card or a face as Scryfall describes it: a string name, and images with a string art crop when present.
 *
 * @param value - An entry of a collection response's `data`, or one of its faces.
 * @returns `true` when the shape is one `remember` can read.
 */
function isScryfallFace(value: unknown): value is ScryfallFace {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  if (value.image_uris === undefined) {
    return true;
  }

  return (
    isRecord(value.image_uris) &&
    (value.image_uris.art_crop === undefined ||
      typeof value.image_uris.art_crop === "string")
  );
}

/**
 * Checks whether a value is a well-formed card, with its faces well-formed too when it has any.
 *
 * @param value - An entry of a collection response's `data`.
 * @returns `true` when `remember` can read the card.
 */
function isScryfallCard(value: unknown): value is ScryfallCard {
  if (!isRecord(value)) {
    return false;
  }

  const faces = value.card_faces;

  if (
    faces !== undefined &&
    (!Array.isArray(faces) || !faces.every(isScryfallFace))
  ) {
    return false;
  }

  return isScryfallFace(value);
}

/**
 * Keeps an art crop address only when it is on Scryfall's CDN, the one image host besides Endstep that the site's policy allows.
 *
 * @param address - An `art_crop` address from Scryfall, if any.
 * @returns The address, or `null` when it is missing or on another host.
 */
function onCdn(address: string | undefined): string | null {
  if (!address?.startsWith(SCRYFALL_CDN)) {
    return null;
  }

  return address;
}

/**
 * Remembers a name's art crop when the name was asked, the address is on Scryfall's CDN, and no earlier match gave the name an address.
 *
 * @param asked - The memory keys of the names sent to Scryfall.
 * @param name - A card's full name, or one face's name.
 * @param address - The art crop address that goes with that name, if any.
 */
function rememberArt(
  asked: Set<string>,
  name: string,
  address: string | undefined,
): void {
  const key = nameKey(name);
  const art = onCdn(address);

  if (art && asked.has(key) && !artByName.has(key)) {
    artByName.set(key, art);
  }
}

/**
 * Remembers the addresses in a collection response, for the names that were asked, and every other name asked as not found.
 *
 * A card matches a name by its full name or by any face's name, ignoring case. The first match with an art crop on Scryfall's CDN wins, and a later match never replaces it. A face's name takes that face's art crop, or the card's when the faces share one image, as an adventure does. The full name takes the card's art crop, or its first face's. A name that matches no card counts as not found, whether Scryfall lists it in `not_found` or answers with another spelling, such as "Lim-Dûl's Vault" for "Lim-Dul's Vault". So does a card without an art crop on Scryfall's CDN. Its deck falls back to Endstep's endpoint.
 *
 * @param asked - The memory keys of the names sent to Scryfall.
 * @param cards - The cards of Scryfall's collection response.
 */
function remember(asked: Set<string>, cards: ScryfallCard[]): void {
  for (const card of cards) {
    const faces = card.card_faces ?? [];

    rememberArt(
      asked,
      card.name,
      card.image_uris?.art_crop ?? faces[0]?.image_uris?.art_crop,
    );

    for (const face of faces) {
      rememberArt(
        asked,
        face.name,
        face.image_uris?.art_crop ?? card.image_uris?.art_crop,
      );
    }
  }

  for (const key of asked) {
    if (!artByName.has(key)) {
      artByName.set(key, null);
    }
  }
}

/**
 * Asks Scryfall, in one collection request, for the card names this instance has not seen yet.
 *
 * Never retries. After a 429 it sends nothing for 30 seconds, Scryfall's own lockout.
 *
 * @param names - The card names by memory key, each in the spelling Endstep sent.
 * @returns A Promise resolving to `true` when every name has an address or a not-found answer in memory, and `false` when the lookup failed, timed out, met a 429, was paused, or got a body it could not read. A failed lookup stores nothing.
 * @see https://scryfall.com/docs/api/cards/collection
 */
async function lookUpArt(names: Map<string, string>): Promise<boolean> {
  const missing = [...names].filter(([key]) => !artByName.has(key));

  if (missing.length === 0) {
    return true;
  }

  if (Date.now() < pausedUntil) {
    return false;
  }

  try {
    const response = await fetch(SCRYFALL_COLLECTION, {
      method: "POST",
      headers: SCRYFALL_HEADERS,
      body: JSON.stringify({
        identifiers: missing.map(([, name]) => ({ name })),
      }),
      signal: AbortSignal.timeout(SCRYFALL_TIMEOUT_MS),
    });

    if (response.status === 429) {
      pausedUntil = Date.now() + SCRYFALL_PAUSE_MS;
    }

    if (!response.ok) {
      await response.body?.cancel();
      return false;
    }

    const collection: unknown = await response.json();

    if (
      !isRecord(collection) ||
      !Array.isArray(collection.data) ||
      !collection.data.every(isScryfallCard)
    ) {
      return false;
    }

    remember(new Set(missing.map(([key]) => key)), collection.data);
  } catch {
    return false;
  }

  return true;
}

/**
 * Finds the art crop of each card name on Scryfall's CDN, §3.4. A warm instance asks Scryfall only for the names it has not seen, in one collection request with a one-second bound.
 *
 * @param names - The card names, in the spelling Endstep sent. A name repeated in another case is asked once.
 * @returns A Promise resolving to the address of each name that has one, keyed by the name as given, and whether every name has an address or a not-found answer in memory. `complete` is `false` when the lookup failed, timed out, met a 429, was paused, or got a body it could not read.
 * @see https://scryfall.com/docs/api/cards/collection
 */
export async function findArt(
  names: string[],
): Promise<{ art: Map<string, string>; complete: boolean }> {
  const asked = new Map<string, string>();

  for (const name of names) {
    const key = nameKey(name);

    if (!asked.has(key)) {
      asked.set(key, name);
    }
  }

  const complete = await lookUpArt(asked);
  const art = new Map<string, string>();

  for (const name of names) {
    const address = artByName.get(nameKey(name));

    if (address) {
      art.set(name, address);
    }
  }

  return { art, complete };
}
