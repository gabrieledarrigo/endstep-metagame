const UPSTREAM = "https://endstep.cc/api/metagame/v1";
const TIMEOUT_MS = 8000;

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
function isAllowed(segments: string[]) {
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
function forwardedQuery(query: URLSearchParams) {
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
 * Selects the `Cache-Control` header for a response with the given upstream status.
 *
 * @param status - The HTTP status returned by Endstep.
 * @returns Five minutes at the edge for a success, ten seconds for a rate limit, and no caching for any other error.
 */
function cacheControl(status: number) {
  if (status < 400) {
    return "public, s-maxage=300, stale-while-revalidate=600";
  }

  if (status === 429) {
    return "public, s-maxage=10";
  }

  return "no-store";
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
  fetch: async function handler(req: Request) {
    const baseHeaders: HeadersInit = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...baseHeaders,
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
        status: 204,
      });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
        }),
        {
          headers: {
            ...baseHeaders,
            Allow: "GET, HEAD, OPTIONS",
          },
          status: 405,
        },
      );
    }

    const query = new URL(req.url).searchParams;
    const segments = query.getAll("path").join("/").split("/").filter(Boolean);

    if (!isAllowed(segments)) {
      return new Response(
        JSON.stringify({
          error: "Unsupported metagame path",
        }),
        {
          headers: baseHeaders,
          status: 400,
        },
      );
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
      return new Response(
        JSON.stringify({
          error: "Endstep is unreachable",
        }),
        {
          headers: baseHeaders,
          status: 502,
        },
      );
    }

    return new Response(body, {
      headers: {
        ...baseHeaders,
        "Content-Type": contentType ?? "application/json",
        "Cache-Control": cacheControl(status),
      },
      status,
    });
  },
};
