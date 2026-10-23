export const EDGE_CACHE = "public, s-maxage=300, stale-while-revalidate=600";
export const PARTIAL_ART_CACHE =
  "public, s-maxage=60, stale-while-revalidate=600";

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
 * Lets go of a response body that the caller will not read, so the connection can close.
 *
 * @param response - A response whose body is not needed.
 * @returns A Promise that resolves once the body is cancelled, and also when cancelling fails, so a dropped connection never turns into a failure of its own.
 */
export async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    return;
  }
}
