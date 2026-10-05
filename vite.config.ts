import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import metagame from "./api/metagame.ts";

const FUNCTION = "/api/metagame";
const PREFIX = `${FUNCTION}/`;

type Cached = {
  expires: number;
  status: number;
  headers: [string, string][];
  body: Buffer;
};

/**
 * Serves the Vercel functions during development, with the rewrite from `vercel.json` and the cache lifetime each response declares.
 *
 * @returns A Vite plugin that answers `/api/metagame/*` for both `vite` and `vite preview`.
 */
function api(): Plugin {
  const cache = new Map<string, Cached>();

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname !== FUNCTION && !url.pathname.startsWith(PREFIX)) {
      next();
      return;
    }

    const key = `${req.method} ${req.url}`;
    let entry = cache.get(key);

    try {
      if (!entry || entry.expires < Date.now()) {
        if (url.pathname.startsWith(PREFIX)) {
          url.searchParams.set("path", url.pathname.slice(PREFIX.length));
        }
        const response = await metagame.fetch(
          new Request(`http://localhost${FUNCTION}?${url.searchParams}`, {
            method: req.method,
          }),
        );
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
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), api()],
});
