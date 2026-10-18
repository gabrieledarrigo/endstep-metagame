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
