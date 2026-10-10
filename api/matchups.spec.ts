import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import matchups from "./matchups.js";

const UPSTREAM = "https://endstep.cc/api/metagame/v1";

type DeckRow = {
  id: string;
  slug: string;
  name: string;
  machineNamed: boolean;
  colours: string[];
  share: { registrations: number; totalRegistrations: number; rate: number };
  players: number;
};

type Opponent = {
  id: string;
  slug: string;
  name: string;
  machineNamed: boolean;
};

type MatchupRow = {
  wins: number;
  losses: number;
  matches: number;
  required: number;
  gate: string | null;
  rate: number | null;
  low: number | null;
  high: number | null;
  deff: number | null;
  opponent: Opponent;
};

const WINDOW = {
  preset: "30d",
  from: "2026-09-10",
  to: "2026-10-09",
  since: null,
  until: null,
};

function deck(name: string, rate: number): DeckRow {
  const slug = name.toLowerCase();

  return {
    id: `id-${slug}`,
    slug,
    name,
    machineNamed: false,
    colours: ["U"],
    share: { registrations: 10, totalRegistrations: 100, rate },
    players: 7,
  };
}

const DECKS = [
  deck("Affinity", 0.3),
  deck("Elves", 0.2),
  deck("Flicker", 0.1),
  deck("Walls", 0.05),
];

function opponent(slug: string): Opponent {
  return { id: `id-${slug}`, slug, name: slug, machineNamed: false };
}

function record(slug: string, wins: number, losses: number): MatchupRow {
  const rate = wins / (wins + losses);

  return {
    wins,
    losses,
    matches: wins + losses,
    required: 5,
    gate: null,
    rate,
    low: rate - 0.25,
    high: rate + 0.125,
    deff: 1.2,
    opponent: opponent(slug),
  };
}

function gated(slug: string, wins: number, losses: number): MatchupRow {
  return {
    wins,
    losses,
    matches: wins + losses,
    required: 5,
    gate: "too_few",
    rate: null,
    low: null,
    high: null,
    deff: null,
    opponent: opponent(slug),
  };
}

const MATCHUPS: Record<string, MatchupRow[]> = {
  affinity: [
    record("elves", 6, 2),
    record("outsider", 9, 1),
    record("affinity", 3, 3),
    gated("flicker", 1, 2),
  ],
  elves: [record("affinity", 3, 5), record("flicker", 3, 1)],
  flicker: [],
  walls: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function endstep(
  answer: (url: URL) => Response | undefined = () => undefined,
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    const answered = answer(url);

    if (answered) {
      return answered;
    }

    if (url.pathname.endsWith("/Pauper/decks")) {
      return json({
        provenance: { window: WINDOW, population: "rated" },
        decks: { items: DECKS, total: 40, page: 1, pageSize: 24 },
      });
    }

    const slug = url.pathname.split("/").at(-2) ?? "";

    return json({
      deck: opponent(slug),
      matchups: { items: MATCHUPS[slug], total: 2, page: 1, pageSize: 50 },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(search: string, method = "GET"): Request {
  return new Request(`http://localhost/api/matchups${search}`, { method });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the matchup function", () => {
  it("fetches the top 24 decks, then each deck's first 50 matchups", async () => {
    const fetchMock = endstep();

    await matchups.fetch(request("?window=30d"));

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${UPSTREAM}/Pauper/decks?window=30d&population=rated&sort=share&dir=desc&pageSize=24`,
      ...DECKS.map(
        ({ slug }) =>
          `${UPSTREAM}/Pauper/decks/${slug}/matchups?window=30d&population=rated&sort=matches&dir=desc&pageSize=50`,
      ),
    ]);
  });

  it("gives every upstream call the 8 second timeout", async () => {
    endstep();
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await matchups.fetch(request("?window=30d"));

    expect(timeout).toHaveBeenCalledTimes(5);
    expect(timeout.mock.calls.every(([ms]) => ms === 8000)).toBe(true);
  });

  it("returns the window, the decks in share order, and the cells between them", async () => {
    endstep();

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      window: { from: "2026-09-10", to: "2026-10-09" },
      decks: DECKS.map(({ id, slug, name, colours, share }) => ({
        id,
        slug,
        name,
        colours,
        share: share.rate,
      })),
      cells: {
        affinity: {
          elves: {
            wins: 6,
            losses: 2,
            matches: 8,
            rate: 0.75,
            low: 0.5,
            high: 0.875,
            gate: null,
          },
          flicker: {
            wins: 1,
            losses: 2,
            matches: 3,
            rate: null,
            low: null,
            high: null,
            gate: "too_few",
          },
        },
        elves: {
          affinity: {
            wins: 3,
            losses: 5,
            matches: 8,
            rate: 0.375,
            low: 0.125,
            high: 0.5,
            gate: null,
          },
          flicker: {
            wins: 3,
            losses: 1,
            matches: 4,
            rate: 0.75,
            low: 0.5,
            high: 0.875,
            gate: null,
          },
        },
        flicker: {
          affinity: {
            wins: 2,
            losses: 1,
            matches: 3,
            rate: null,
            low: null,
            high: null,
            gate: "too_few",
          },
          elves: {
            wins: 1,
            losses: 3,
            matches: 4,
            rate: 0.25,
            low: 0.125,
            high: 0.5,
            gate: null,
          },
        },
        walls: {},
      },
    });
  });

  it("caches a success for five minutes, with the CORS headers", async () => {
    endstep();

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it.each(["1d", "7d", "14d", "30d", "season"])(
    "accepts the %s window",
    async (timeWindow) => {
      const fetchMock = endstep();

      const response = await matchups.fetch(request(`?window=${timeWindow}`));

      expect(response.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        `?window=${timeWindow}&`,
      );
    },
  );

  it.each([
    ["no query string", ""],
    ["an empty window", "?window="],
    ["an unknown window", "?window=90d"],
    ["a window in another case", "?window=30D"],
    ["a parameter in another case", "?Window=30d"],
    ["a repeated window", "?window=30d&window=30d"],
    ["another parameter after the window", "?window=30d&population=rated"],
    ["another parameter before the window", "?population=rated&window=30d"],
    ["a trailing separator", "?window=30d&"],
    ["an encoded window", "?window=%33%30d"],
    ["an encoded name", "?%77indow=30d"],
    ["a padded window", "?window=+30d"],
    ["an encoded padding", "?window=30d%20"],
  ])("rejects %s without calling Endstep", async (_, search) => {
    const fetchMock = endstep();

    const response = await matchups.fetch(request(search));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a POST without calling Endstep", async () => {
    const fetchMock = endstep();

    const response = await matchups.fetch(request("?window=30d", "POST"));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers the CORS preflight without calling Endstep", async () => {
    const fetchMock = endstep();

    const response = await matchups.fetch(request("?window=30d", "OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, HEAD, OPTIONS",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers a HEAD request without a body", async () => {
    endstep();

    const response = await matchups.fetch(request("?window=30d", "HEAD"));

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  });

  it.each([
    ["the deck list is rate limited", "/Pauper/decks", 429, 429],
    ["a deck's matchups are rate limited", "/elves/matchups", 429, 429],
    ["the deck list fails", "/Pauper/decks", 500, 502],
    ["a deck's matchups fail", "/flicker/matchups", 503, 502],
    ["a deck's matchups are not found", "/walls/matchups", 404, 502],
  ])(
    "fails the whole request when %s",
    async (_, path, upstreamStatus, status) => {
      endstep((url) =>
        url.pathname.endsWith(path)
          ? json({ error: "nope" }, upstreamStatus)
          : undefined,
      );

      const response = await matchups.fetch(request("?window=30d"));

      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe(
        status === 429 ? "public, s-maxage=60" : "no-store",
      );
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(await response.json()).toHaveProperty("error");
    },
  );

  it("answers 429 when one call is rate limited and another fails", async () => {
    endstep((url) => {
      if (url.pathname.endsWith("/affinity/matchups")) {
        return json({ error: "nope" }, 500);
      }

      if (url.pathname.endsWith("/walls/matchups")) {
        return json({ error: "slow down" }, 429);
      }

      return undefined;
    });

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.status).toBe(429);
  });

  it("answers 502 when Endstep cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 502 when a call times out", async () => {
    endstep((url) => {
      if (url.pathname.endsWith("/elves/matchups")) {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }

      return undefined;
    });

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.status).toBe(502);
  });

  it("answers 502 when Endstep answers with a body that is not JSON", async () => {
    endstep((url) =>
      url.pathname.endsWith("/flicker/matchups")
        ? new Response("<html>", { status: 200 })
        : undefined,
    );

    const response = await matchups.fetch(request("?window=30d"));

    expect(response.status).toBe(502);
  });
});
