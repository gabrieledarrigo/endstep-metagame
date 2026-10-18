import {
  BASE_HEADERS,
  SEGMENT,
  TIMEOUT_MS,
  UPSTREAM,
  cacheControl,
  errorResponse,
  hasNoBody,
  methodResponse,
} from "./_shared.js";

const RATE_LIMIT_SECONDS = 10;

const ENDPOINTS = [
  ["formats"],
  ["visibility"],
  [":format", "decks"],
  [":format", "share-series"],
  [":format", "decks", ":slug"],
  [":format", "decks", ":slug", "matchups"],
  [":format", "decks", ":slug", "cards"],
  [":format", "decks", ":slug", "ratings"],
];

const QUERY_PARAMS = [
  "window",
  "population",
  "ratingBand",
  "minMatches",
  "q",
  "sort",
  "dir",
  "page",
  "pageSize",
  "section",
  "type",
  "width",
  "decks",
  "v",
];

const SCRYFALL_COLLECTION = "https://api.scryfall.com/cards/collection";
const SCRYFALL_TIMEOUT_MS = 1000;
const SCRYFALL_PAUSE_MS = 30_000;
const SCRYFALL_HEADERS: Readonly<Record<string, string>> = {
  "User-Agent":
    "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/endstep-metagame)",
  Accept: "application/json",
  "Content-Type": "application/json",
};
const ART_HOST = "https://cards.scryfall.io/";
const PARTIAL_ART_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

type ArtDeck = {
  art: { cardName: string; imageUrl?: string };
};

type ScryfallImages = { art_crop?: string };

type ScryfallFace = { name: string; image_uris?: ScryfallImages };

type ScryfallCard = ScryfallFace & { card_faces?: ScryfallFace[] };

const artByName = new Map<string, string | null>();
let pausedUntil = 0;

/**
 * Checks whether the path segments match one of the allow-listed Endstep endpoints.
 *
 * A part in `ENDPOINTS` that starts with `:` matches any segment that passes the `SEGMENT` pattern.
 *
 * @param segments - The path segments that follow `/api/metagame/`.
 * @returns `true` when every segment is safe and the sequence matches an endpoint shape.
 */
function isAllowed(segments: string[]): boolean {
  if (segments.length === 0) {
    return false;
  }

  if (!segments.every((segment) => SEGMENT.test(segment))) {
    return false;
  }

  return ENDPOINTS.some(
    (shape) =>
      shape.length === segments.length &&
      shape.every((part, i) => part.startsWith(":") || part === segments[i]),
  );
}

/**
 * Builds the upstream query string from the allow-listed parameters only.
 *
 * @param query - The query parameters of the incoming request.
 * @returns The filtered query string with a leading `?`, or an empty string when no parameter is left.
 */
function forwardedQuery(query: URLSearchParams): string {
  const params = new URLSearchParams();

  for (const name of QUERY_PARAMS) {
    const value = query.get(name);

    if (value !== null) {
      params.set(name, value);
    }
  }

  const search = params.toString();

  return search ? `?${search}` : "";
}

/**
 * Checks whether a value is a plain object, so its properties can be read.
 *
 * @param value - Any parsed JSON value.
 * @returns `true` for an object that is not `null`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Checks whether a value is a deck with a key card name.
 *
 * @param value - A deck from a deck list or a deck detail.
 * @returns `true` when `art.cardName` is a string that is not blank.
 */
function isArtDeck(value: unknown): value is ArtDeck {
  return (
    isRecord(value) &&
    isRecord(value.art) &&
    typeof value.art.cardName === "string" &&
    value.art.cardName.trim() !== ""
  );
}

/**
 * Finds the decks that get art in an Endstep response, by the path's shape: `decks.items` for a deck list, `deck` for a deck detail.
 *
 * @param segments - The allow-listed path segments.
 * @param body - The parsed response body.
 * @returns The decks that have a key card name, or `null` for any other path or a body without such decks.
 */
function decksIn(segments: string[], body: unknown): ArtDeck[] | null {
  if (segments[1] !== "decks" || !isRecord(body)) {
    return null;
  }

  let decks: unknown[] = [];

  if (segments.length === 2 && isRecord(body.decks)) {
    decks = Array.isArray(body.decks.items) ? body.decks.items : [];
  }

  if (segments.length === 3) {
    decks = [body.deck];
  }

  const named = decks.filter(isArtDeck);

  if (named.length === 0) {
    return null;
  }

  return named;
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
  if (!address?.startsWith(ART_HOST)) {
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
 * Adds `art.imageUrl` to each deck of a deck list or a deck detail, from Scryfall, §3.4.
 *
 * @param segments - The allow-listed path segments.
 * @param text - Endstep's response body.
 * @returns A Promise resolving to the body and whether every deck's card has an answer, or to `null` when the response carries no decks to add art to. The body is Endstep's own text when no deck got an address.
 */
async function withArt(
  segments: string[],
  text: string,
): Promise<{ body: string; complete: boolean } | null> {
  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }

  const decks = decksIn(segments, body);

  if (!decks) {
    return null;
  }

  const names = new Map<string, string>();

  for (const deck of decks) {
    const key = nameKey(deck.art.cardName);

    if (!names.has(key)) {
      names.set(key, deck.art.cardName);
    }
  }

  const complete = await lookUpArt(names);
  let added = false;

  for (const deck of decks) {
    const address = artByName.get(nameKey(deck.art.cardName));

    if (address) {
      deck.art.imageUrl = address;
      added = true;
    }
  }

  if (!added) {
    return { body: text, complete };
  }

  return { body: JSON.stringify(body), complete };
}

export default {
  /**
   * Proxies a metagame request to the Endstep API and returns the response with CORS headers.
   *
   * The endpoint path arrives in the `path` query parameter, set by the rewrite in `vercel.json`.
   * GET and HEAD are forwarded. OPTIONS answers the CORS preflight with 204.
   * A successful GET of a deck list or a deck detail gets each deck's art address from Scryfall, §4.3. When the lookup fails, the response goes out without the missing addresses and is cached for 60 seconds.
   *
   * @param req - The incoming request.
   * @returns A Promise resolving to the upstream response, or to a JSON error: 400 for a path outside the allow-list, 405 for any other method, 502 when Endstep is unreachable.
   * @see https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard
   */
  fetch: async function handler(req: Request): Promise<Response> {
    const refused = methodResponse(req);

    if (refused) {
      return refused;
    }

    const query = new URL(req.url).searchParams;
    const segments = query.getAll("path").join("/").split("/").filter(Boolean);

    if (!isAllowed(segments)) {
      return errorResponse(400, "Unsupported metagame path");
    }

    const target = `${UPSTREAM}/${segments.join("/")}${forwardedQuery(query)}`;

    let status;
    let contentType;
    let body;

    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      status = upstream.status;
      contentType = upstream.headers.get("content-type");
      body = await upstream.text();
    } catch {
      return errorResponse(502, "Endstep is unreachable");
    }

    let cache = cacheControl(status, RATE_LIMIT_SECONDS);
    const enriched =
      req.method === "GET" && status >= 200 && status < 300
        ? await withArt(segments, body)
        : null;

    if (enriched) {
      body = enriched.body;
    }

    if (enriched && !enriched.complete) {
      cache = PARTIAL_ART_CACHE;
    }

    return new Response(hasNoBody(status) ? null : body, {
      headers: {
        ...BASE_HEADERS,
        "Content-Type": contentType ?? "application/json",
        "Cache-Control": cache,
      },
      status,
    });
  },
};
