import { SEGMENT, TIMEOUT_MS, UPSTREAM } from "../server/endstep.js";
import {
  BASE_HEADERS,
  PARTIAL_ART_CACHE,
  cacheControl,
  errorResponse,
  hasNoBody,
  isRecord,
  methodResponse,
} from "../server/http.js";
import { findArt } from "../server/scryfall.js";

const RATE_LIMIT_SECONDS = 10;
const ART_BOUND_MS = 1000;

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

type ArtDeck = {
  art: { cardName: string; imageUrl?: string };
};

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

  const { art, complete } = await findArt(
    decks.map((deck) => deck.art.cardName),
    ART_BOUND_MS,
  );
  let added = false;

  for (const deck of decks) {
    const address = art.get(deck.art.cardName);

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
