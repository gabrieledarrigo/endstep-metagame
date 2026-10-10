import {
  BASE_HEADERS,
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

const SEGMENT = /^[A-Za-z0-9_-]+$/;

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

export default {
  /**
   * Proxies a metagame request to the Endstep API and returns the response with CORS headers.
   *
   * The endpoint path arrives in the `path` query parameter, set by the rewrite in `vercel.json`.
   * GET and HEAD are forwarded. OPTIONS answers the CORS preflight with 204.
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

    return new Response(hasNoBody(status) ? null : body, {
      headers: {
        ...BASE_HEADERS,
        "Content-Type": contentType ?? "application/json",
        "Cache-Control": cacheControl(status, RATE_LIMIT_SECONDS),
      },
      status,
    });
  },
};
