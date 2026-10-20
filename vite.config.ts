/// <reference types="vitest/config" />
import {
  defineConfig,
  type Connect,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import react from "@vitejs/plugin-react";
import deckPage from "./api/deck-page.ts";
import matchups from "./api/matchups.ts";
import metagame from "./api/metagame.ts";
import sampleCards from "./api/sample-cards.ts";
import staples from "./api/staples.ts";
import vercel from "./vercel.json" with { type: "json" };

const METAGAME = "/api/metagame";
const METAGAME_PREFIX = `${METAGAME}/`;
const MATCHUPS = "/api/matchups";
const SAMPLE_CARDS = "/api/sample-cards";
const STAPLES = "/api/staples";
const DECK_PAGE = /^\/decks\/([^/?]+)(\?.*)?$/;
const LOOPBACK = new Map([
  ["::", "::1"],
  ["0.0.0.0", "127.0.0.1"],
]);

export const CATCH_ALL_SOURCE = "/(.*)";

/**
 * Reads the headers that `vercel.json` sets for one source pattern.
 *
 * @param source - The rule's `source`, such as `/(.*)`.
 * @returns The rule's headers by name, or an empty object when no rule has that source.
 */
export function vercelHeaders(source: string): Record<string, string> {
  const rule = vercel.headers.find((candidate) => candidate.source === source);

  return Object.fromEntries(
    (rule?.headers ?? []).map(({ key, value }) => [key, value]),
  );
}

/**
 * Sends the headers of the catch-all rule in `vercel.json` on every `vite preview` response, as production does.
 *
 * @returns A Vite plugin whose preview middleware sets the headers and passes the request on. It must come before the plugins that answer requests.
 */
export function previewSecurityHeaders(): Plugin {
  const headers = vercelHeaders(CATCH_ALL_SOURCE);

  return {
    name: "preview-security-headers",
    configurePreviewServer(server): void {
      server.middlewares.use((_req, res, next) => {
        Object.entries(headers).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        next();
      });
    },
  };
}

function serverOrigin(
  httpServer: ViteDevServer["httpServer"] | PreviewServer["httpServer"],
  https: unknown,
): string | null {
  const address = httpServer?.address();

  if (!address || typeof address === "string") {
    return null;
  }

  const ip = LOOPBACK.get(address.address) ?? address.address;
  const host = address.family === "IPv6" ? `[${ip}]` : ip;
  const scheme = https ? "https" : "http";

  return `${scheme}://${host}:${address.port}`;
}

/**
 * Serves `/decks/:slug` through the deck page's function in `vite preview`, with the rewrite from `vercel.json`, so the link preview can be checked before a merge.
 *
 * @returns A Vite plugin whose preview middleware answers the deck pages and passes every other request on. The function's own fetch goes to the preview server's address, never to the request's `Host`. The dev server keeps serving its own `index.html`.
 */
export function previewDeckPage(): Plugin {
  return {
    name: "preview-deck-page",
    configurePreviewServer(server): void {
      server.middlewares.use(async (req, res, next) => {
        try {
          const match = DECK_PAGE.exec(req.url ?? "/");

          if (match === null) {
            next();
            return;
          }

          const origin = serverOrigin(
            server.httpServer,
            server.config.preview.https,
          );

          if (origin === null) {
            next();
            return;
          }

          const target = new URL(`${origin}/api/deck-page`);
          target.search = match[2] ?? "";
          target.searchParams.append("slug", match[1]);

          const response = await deckPage.fetch(
            new Request(target, { method: req.method }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, name) => {
            res.setHeader(name, value);
          });
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

type FunctionTarget = {
  handler: { fetch: (req: Request) => Promise<Response> };
  request: Request;
};

type Cached = {
  expires: number;
  status: number;
  headers: [string, string][];
  body: Buffer;
};

/**
 * Builds the request a Vercel function would receive for a development request, with the rewrite from `vercel.json`.
 *
 * @param url - The request's URL, as the dev server received it.
 * @param method - The request's method.
 * @param origin - The server's own address, or `null` before it listens.
 * @returns The function and its request, or `null` when the URL is not a function's, or is the sample cards function's before the server has an address. The matchup, staples and sample cards functions get the raw query string unchanged, because they match it byte for byte, §4.4, §4.9 and §4.10. The sample cards function gets the server's own address, so its fetch of the deck detail comes back to this server.
 */
function functionRequest(
  url: string,
  method: string | undefined,
  origin: string | null,
): FunctionTarget | null {
  const parsed = new URL(url, "http://localhost");

  if (parsed.pathname === SAMPLE_CARDS) {
    if (origin === null) {
      return null;
    }

    return {
      handler: sampleCards,
      request: new Request(`${origin}${SAMPLE_CARDS}${parsed.search}`, {
        method,
      }),
    };
  }

  if (parsed.pathname === MATCHUPS) {
    return {
      handler: matchups,
      request: new Request(parsed, { method }),
    };
  }

  if (parsed.pathname === STAPLES) {
    return {
      handler: staples,
      request: new Request(parsed, { method }),
    };
  }

  if (
    parsed.pathname !== METAGAME &&
    !parsed.pathname.startsWith(METAGAME_PREFIX)
  ) {
    return null;
  }

  if (parsed.pathname.startsWith(METAGAME_PREFIX)) {
    parsed.searchParams.set(
      "path",
      parsed.pathname.slice(METAGAME_PREFIX.length),
    );
  }

  return {
    handler: metagame,
    request: new Request(`http://localhost${METAGAME}?${parsed.searchParams}`, {
      method,
    }),
  };
}

/**
 * Serves the Vercel functions during development, with the rewrite from `vercel.json` and the cache lifetime each response declares.
 *
 * @returns A Vite plugin that answers `/api/metagame/*`, `/api/matchups`, `/api/staples` and `/api/sample-cards` for both `vite` and `vite preview`.
 */
function api(): Plugin {
  const cache = new Map<string, Cached>();

  const middleware =
    (origin: () => string | null): Connect.NextHandleFunction =>
    async (req, res, next) => {
      let target;

      try {
        target = functionRequest(req.url ?? "/", req.method, origin());
      } catch (error) {
        next(error);
        return;
      }

      if (!target) {
        next();
        return;
      }

      const key = `${req.method} ${req.url}`;
      let entry = cache.get(key);

      try {
        if (!entry || entry.expires < Date.now()) {
          const response = await target.handler.fetch(target.request);
          const maxAge = Number(
            /s-maxage=(\d+)/.exec(
              response.headers.get("cache-control") ?? "",
            )?.[1] ?? 0,
          );

          entry = {
            expires: Date.now() + maxAge * 1000,
            status: response.status,
            headers: [...response.headers],
            body: Buffer.from(await response.arrayBuffer()),
          };

          if (maxAge > 0) {
            cache.set(key, entry);
          }
        }
      } catch (error) {
        next(error);
        return;
      }

      res.statusCode = entry.status;
      entry.headers.forEach(([name, value]) => {
        res.setHeader(name, value);
      });
      res.end(entry.body);
    };

  return {
    name: "endstep-api",
    configureServer(server): void {
      server.middlewares.use(
        middleware(() =>
          serverOrigin(server.httpServer, server.config.server.https),
        ),
      );
    },
    configurePreviewServer(server): void {
      server.middlewares.use(
        middleware(() =>
          serverOrigin(server.httpServer, server.config.preview.https),
        ),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), previewSecurityHeaders(), previewDeckPage(), api()],
  build: {
    target: "es2025",
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: [
            "api/**/*.spec.ts",
            "server/**/*.spec.ts",
            "vercel.spec.ts",
            "vite.config.spec.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          include: ["src/**/*.spec.{js,jsx,ts,tsx}"],
          setupFiles: ["./test/setup.ts"],
          css: { include: [/tokens\.css/] },
        },
      },
    ],
  },
});
