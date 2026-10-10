export const UPSTREAM = "https://endstep.cc/api/metagame/v1";
export const TIMEOUT_MS = 8000;

export const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const NO_BODY = [204, 205, 304];

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
    return "public, s-maxage=300, stale-while-revalidate=600";
  }

  if (status === 429) {
    return `public, s-maxage=${rateLimitSeconds}`;
  }

  return "no-store";
}
