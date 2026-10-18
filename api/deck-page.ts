import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  EDGE_CACHE,
  PARTIAL_ART_CACHE,
  SEGMENT,
  WINDOWS,
  deckDetailUrl,
  isRecord,
} from "./_shared.js";

const SITE_ORIGIN = "https://pauper-endstep-metagame.vercel.app";
const SITE_NAME = "Pauper Endstep metagame";
const DEFAULT_WINDOW = "30d";
const BOUND_MS = 2000;
const NO_STORE = "no-store";
const LOCALE = "en-GB";
const DECIDED_NEEDED = 20;
const TOO_FEW_TO_CALL = "match win rate too few to call";

const PERIODS: Readonly<Record<string, string>> = {
  "1d": "over the last day",
  "7d": "over the last 7 days",
  "14d": "over the last 14 days",
  "30d": "over the last 30 days",
  season: "this season",
};

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const PERCENT = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Target = { slug: string; window: string };

type PreviewDeck = {
  slug: string;
  name: string;
  share: { rate: number };
  players: number;
  matchWinRate: {
    wins: number;
    losses: number;
    rate: number | null;
    low?: unknown;
    high?: unknown;
    gate?: unknown;
  };
  art: { cardName: string; imageUrl?: string };
};

let indexHtml: Promise<string> | undefined;

function builtPage(): Promise<string> {
  if (!indexHtml) {
    indexHtml = readFile(
      join(process.cwd(), "dist", "index.html"),
      "utf8",
    ).catch((error: unknown) => {
      indexHtml = undefined;
      throw error;
    });
  }

  return indexHtml;
}

function targetOf(query: URLSearchParams): Target | null {
  const slugs = query.getAll("slug");
  const windows = query.getAll("window");

  if (slugs.length !== 1 || !SEGMENT.test(slugs[0])) {
    return null;
  }

  if (windows.length > 1) {
    return null;
  }

  const timeWindow = windows[0] ?? DEFAULT_WINDOW;

  if (!WINDOWS.includes(timeWindow)) {
    return null;
  }

  return { slug: slugs[0], window: timeWindow };
}

function isPreviewDeck(value: unknown): value is PreviewDeck {
  if (!isRecord(value) || !isRecord(value.share)) {
    return false;
  }

  if (!isRecord(value.matchWinRate) || !isRecord(value.art)) {
    return false;
  }

  const { matchWinRate, art } = value;

  return (
    typeof value.slug === "string" &&
    SEGMENT.test(value.slug) &&
    typeof value.name === "string" &&
    typeof value.share.rate === "number" &&
    typeof value.players === "number" &&
    typeof matchWinRate.wins === "number" &&
    typeof matchWinRate.losses === "number" &&
    (matchWinRate.rate === null || typeof matchWinRate.rate === "number") &&
    typeof art.cardName === "string" &&
    (art.imageUrl === undefined || typeof art.imageUrl === "string")
  );
}

async function deckDetail(
  origin: string,
  target: Target,
): Promise<PreviewDeck | null> {
  try {
    const response = await fetch(
      deckDetailUrl(origin, target.slug, target.window),
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(BOUND_MS),
      },
    );

    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }

    const body: unknown = await response.json();

    if (!isRecord(body) || !isPreviewDeck(body.deck)) {
      return null;
    }

    return body.deck;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ENTITIES[character]);
}

function shareText(rate: number): string {
  if (rate > 0 && rate < 0.0005) {
    return `<${PERCENT.format(0.001)}`;
  }

  return PERCENT.format(rate);
}

function winRateText(block: PreviewDeck["matchWinRate"]): string {
  if (
    block.gate ||
    block.wins + block.losses < DECIDED_NEEDED ||
    block.rate === null ||
    block.low === null ||
    block.high === null
  ) {
    return TOO_FEW_TO_CALL;
  }

  return `${PERCENT.format(block.rate)} match win rate`;
}

function description(deck: PreviewDeck, timeWindow: string): string {
  const players = `${deck.players.toLocaleString(LOCALE)} ${deck.players === 1 ? "player" : "players"}`;

  return `${shareText(deck.share.rate)} of the Pauper field ${PERIODS[timeWindow]}, ${winRateText(deck.matchWinRate)}, ${players}.`;
}

function imageOf(art: PreviewDeck["art"]): string {
  if (art.imageUrl) {
    return art.imageUrl;
  }

  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: art.cardName,
    version: "art_crop",
  })}`;
}

function withMeta(
  html: string,
  attribute: string,
  value: string,
  content: string,
): string {
  const tag = new RegExp(`<meta\\b[^>]*\\b${attribute}="${value}"[^>]*>`);

  return html.replace(
    tag,
    () => `<meta ${attribute}="${value}" content="${escapeHtml(content)}" />`,
  );
}

function preview(html: string, deck: PreviewDeck, timeWindow: string): string {
  const title = `${deck.name} · ${SITE_NAME}`;
  const text = description(deck, timeWindow);
  const address = escapeHtml(`${SITE_ORIGIN}/decks/${deck.slug}`);
  let page = html.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${escapeHtml(title)}</title>`,
  );

  page = withMeta(page, "name", "description", text);
  page = withMeta(page, "property", "og:title", title);
  page = withMeta(page, "property", "og:description", text);
  page = withMeta(page, "property", "og:image", imageOf(deck.art));

  return page.replace(
    "</head>",
    () =>
      `<link rel="canonical" href="${address}" />\n<meta property="og:url" content="${address}" />\n</head>`,
  );
}

function pageResponse(method: string, html: string, cache: string): Response {
  return new Response(method === "HEAD" ? null : html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
    },
    status: 200,
  });
}

export default {
  /**
   * Serves the deck page's HTML with the deck's own link preview, FR-15.
   *
   * `vercel.json` rewrites `/decks/:slug` here, with the slug in the `slug` query parameter and the link's own parameters beside it.
   * The function reads the built `index.html`, fetches the deck detail through our proxy, and writes the deck's title, description, art crop, canonical link and `og:url` into the head.
   * The page is cached at the edge for five minutes when the deck's art resolved, and for one minute when it did not.
   * A rejected slug or window, a failed call, a call longer than two seconds, or a body it cannot read gets the page with the site card, sent with `no-store`.
   *
   * @param req - The incoming request.
   * @returns A Promise resolving to the page, or to a 405 for any method other than GET or HEAD.
   * @see https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard
   */
  fetch: async function handler(req: Request): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method not allowed", {
        headers: { Allow: "GET, HEAD", "Content-Type": "text/plain" },
        status: 405,
      });
    }

    const html = await builtPage();
    const url = new URL(req.url);
    const target = targetOf(url.searchParams);

    if (!target) {
      return pageResponse(req.method, html, NO_STORE);
    }

    const deck = await deckDetail(url.origin, target);

    if (!deck) {
      return pageResponse(req.method, html, NO_STORE);
    }

    return pageResponse(
      req.method,
      preview(html, deck, target.window),
      deck.art.imageUrl ? EDGE_CACHE : PARTIAL_ART_CACHE,
    );
  },
};
