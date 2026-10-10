import {
  BASE_HEADERS,
  TIMEOUT_MS,
  UPSTREAM,
  cacheControl,
  errorResponse,
  methodResponse,
} from "./_shared.js";

const RATE_LIMIT_SECONDS = 60;
const WINDOWS = ["1d", "7d", "14d", "30d", "season"];
const TOP_DECKS = 24;
const MATCHUP_ROWS = 50;

type Counts = {
  wins: number;
  losses: number;
  matches: number;
};

type Cell = Counts &
  (
    | { gate: null; rate: number; low: number; high: number }
    | { gate: string; rate: null; low: null; high: null }
  );

type MatrixDeck = {
  id: string;
  slug: string;
  name: string;
  colours: string[];
  share: number;
};

type Matrix = {
  window: { from: string; to: string };
  decks: MatrixDeck[];
  cells: Record<string, Record<string, Cell>>;
};

type UpstreamDeck = {
  id: string;
  slug: string;
  name: string;
  colours: string[];
  share: { rate: number };
};

type DecksBody = {
  provenance: { window: { from: string; to: string } };
  decks: { items: UpstreamDeck[] };
};

type MatchupsBody = {
  matchups: { items: (Cell & { opponent: { id: string } })[] };
};

class UpstreamError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Endstep answered ${status}`);
    this.name = "UpstreamError";
    this.status = status;
  }
}

/**
 * Reads the time window from a query string that matches §4.4 byte for byte.
 *
 * @param search - The raw query string of the request, with its leading `?`.
 * @returns The window, or `undefined` when the query string is anything other than `?window=` and one of the five windows.
 */
function windowOf(search: string): string | undefined {
  return WINDOWS.find((timeWindow) => search === `?window=${timeWindow}`);
}

/**
 * Fetches one Endstep endpoint and parses its JSON body.
 *
 * @param path - The endpoint path after the API version, such as `Pauper/decks`.
 * @param params - The query parameters, in the order they are sent.
 * @returns A Promise resolving to the parsed body.
 * @throws An `UpstreamError` with the status when Endstep answers anything other than a success.
 * @throws The fetch or parse error when Endstep is unreachable, too slow, or answers with a body that is not JSON.
 */
async function upstream<Body>(
  path: string,
  params: Record<string, string>,
): Promise<Body> {
  const response = await fetch(
    `${UPSTREAM}/${path}?${new URLSearchParams(params)}`,
    {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new UpstreamError(response.status);
  }

  return (await response.json()) as Body;
}

/**
 * Checks whether an error is Endstep's rate limit.
 *
 * @param error - The error a build failed with.
 * @returns `true` for an upstream 429.
 */
function isRateLimit(error: unknown): boolean {
  return error instanceof UpstreamError && error.status === 429;
}

/**
 * Copies the fields of a cell from an upstream matchup row.
 *
 * @param row - A row of a deck's matchups.
 * @returns The cell, without the opponent and the fields the table does not use.
 */
function cellOf(row: Cell): Cell {
  const counts = {
    wins: row.wins,
    losses: row.losses,
    matches: row.matches,
  };

  if (row.gate === null) {
    return {
      ...counts,
      gate: null,
      rate: row.rate,
      low: row.low,
      high: row.high,
    };
  }

  return { ...counts, gate: row.gate, rate: null, low: null, high: null };
}

/**
 * Derives the other direction of a pair from the recorded one, §4.4.
 *
 * @param cell - Deck `a`'s record against deck `b`.
 * @returns Deck `b`'s record against deck `a`: wins and losses swapped, the rate and the range reflected, and a gated record kept gated.
 */
function mirrored(cell: Cell): Cell {
  const counts = {
    wins: cell.losses,
    losses: cell.wins,
    matches: cell.matches,
  };

  if (cell.gate === null) {
    return {
      ...counts,
      gate: null,
      rate: 1 - cell.rate,
      low: 1 - cell.high,
      high: 1 - cell.low,
    };
  }

  return { ...counts, gate: cell.gate, rate: null, low: null, high: null };
}

/**
 * Builds the top-24 matchup matrix for one window, §4.4.
 *
 * @param timeWindow - One of the five windows.
 * @returns A Promise resolving to the window, the decks in share order, and each deck's record against the others.
 * @throws The first rate limit when any upstream call answers 429, or else the first failure.
 */
async function build(timeWindow: string): Promise<Matrix> {
  const fixed = { window: timeWindow, population: "rated" };
  const top = await upstream<DecksBody>("Pauper/decks", {
    ...fixed,
    sort: "share",
    dir: "desc",
    pageSize: String(TOP_DECKS),
  });
  const decks = top.decks.items;

  const results = await Promise.allSettled(
    decks.map(async (deck) => ({
      slug: deck.slug,
      page: await upstream<MatchupsBody>(
        `Pauper/decks/${encodeURIComponent(deck.slug)}/matchups`,
        {
          ...fixed,
          sort: "matches",
          dir: "desc",
          pageSize: String(MATCHUP_ROWS),
        },
      ),
    })),
  );
  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  if (failures.length > 0) {
    throw failures.find(isRateLimit) ?? failures[0];
  }

  const slugById = new Map(decks.map((deck) => [deck.id, deck.slug]));
  const cells = new Map(
    decks.map((deck) => [deck.slug, new Map<string, Cell>()]),
  );

  const pages = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  for (const { slug, page } of pages) {
    for (const row of page.matchups.items) {
      const opponent = slugById.get(row.opponent.id);

      if (opponent !== undefined && opponent !== slug) {
        cells.get(slug)?.set(opponent, cellOf(row));
      }
    }
  }

  for (const [slug, row] of cells) {
    for (const [opponent, cell] of row) {
      const other = cells.get(opponent);

      if (other && !other.has(slug)) {
        other.set(slug, mirrored(cell));
      }
    }
  }

  return {
    window: {
      from: top.provenance.window.from,
      to: top.provenance.window.to,
    },
    decks: decks.map((deck) => ({
      id: deck.id,
      slug: deck.slug,
      name: deck.name,
      colours: deck.colours,
      share: deck.share.rate,
    })),
    cells: Object.fromEntries(
      [...cells].map(([slug, row]) => [slug, Object.fromEntries(row)]),
    ),
  };
}

export default {
  /**
   * Builds the top-24 matchup matrix for one window from 25 Endstep calls and returns it in one response, §4.4.
   *
   * The query string must be exactly `?window=` and one of `1d`, `7d`, `14d`, `30d` or `season`. GET and HEAD build the matrix. OPTIONS answers the CORS preflight with 204.
   *
   * @param req - The incoming request.
   * @returns A Promise resolving to the matrix, cached for five minutes, or to a JSON error: 400 for any other query string, 405 for any other method, 429 when Endstep rate limits a call, cached for 60 seconds, and 502 when any other call fails.
   * @see https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard
   */
  fetch: async function handler(req: Request): Promise<Response> {
    const refused = methodResponse(req);

    if (refused) {
      return refused;
    }

    const timeWindow = windowOf(new URL(req.url).search);

    if (timeWindow === undefined) {
      return errorResponse(400, "Unsupported matchups query");
    }

    let matrix;

    try {
      matrix = await build(timeWindow);
    } catch (error) {
      if (isRateLimit(error)) {
        return errorResponse(429, "Endstep's rate limit was reached", {
          "Cache-Control": cacheControl(429, RATE_LIMIT_SECONDS),
        });
      }

      return errorResponse(502, "Endstep did not answer every call");
    }

    return new Response(req.method === "HEAD" ? null : JSON.stringify(matrix), {
      headers: {
        ...BASE_HEADERS,
        "Cache-Control": cacheControl(200, RATE_LIMIT_SECONDS),
      },
      status: 200,
    });
  },
};
