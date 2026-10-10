/// <reference types="vitest/config" />
import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import matchups from "./api/matchups.ts";
import metagame from "./api/metagame.ts";

const METAGAME = "/api/metagame";
const METAGAME_PREFIX = `${METAGAME}/`;
const MATCHUPS = "/api/matchups";

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
 * @returns The function and its request, or `null` when the URL is not a function's. The matchup function gets the raw query string unchanged, because it matches it byte for byte, §4.4.
 */
function functionRequest(
  url: string,
  method: string | undefined,
): FunctionTarget | null {
  const parsed = new URL(url, "http://localhost");

  if (parsed.pathname === MATCHUPS) {
    return {
      handler: matchups,
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
 * @returns A Vite plugin that answers `/api/metagame/*` and `/api/matchups` for both `vite` and `vite preview`.
 */
function api(): Plugin {
  const cache = new Map<string, Cached>();

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const target = functionRequest(req.url ?? "/", req.method);

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
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server): void {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), api()],
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
          include: ["api/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          include: ["src/**/*.spec.{js,jsx,ts,tsx}"],
          setupFiles: ["./test/setup.ts"],
        },
      },
    ],
  },
});
