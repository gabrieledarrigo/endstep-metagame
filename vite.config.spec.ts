import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Plugin, type PreviewServer, build } from "vite";
import {
  type Mock,
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PAGE_PREVIEWS, SITE_NAME, SITE_ORIGIN } from "./server/index.ts";
import {
  SITE_NAME as APP_NAME,
  SITE_ORIGIN as APP_ORIGIN,
} from "./src/config.ts";
import locales from "./src/locales/locales.json" with { type: "json" };
import config, {
  CATCH_ALL_SOURCE,
  pagePreviews,
  previewDeckPage,
  previewSecurityHeaders,
  vercelHeaders,
} from "./vite.config.ts";

const deckPageFetch = vi.hoisted(() =>
  vi.fn<(req: Request) => Promise<Response>>(),
);

vi.mock("./api/deck-page.ts", () => ({ default: { fetch: deckPageFetch } }));

afterEach(() => {
  deckPageFetch.mockReset();
});

function pluginNames(): string[] {
  const plugins: unknown[] = (config.plugins ?? []).flat();

  return plugins
    .filter(
      (plugin): plugin is Plugin =>
        typeof plugin === "object" && plugin !== null && "name" in plugin,
    )
    .map((plugin) => plugin.name);
}

describe("vercelHeaders", () => {
  it("reads the headers of one rule by name", () => {
    expect(vercelHeaders("/assets/(.*)")).toEqual({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });

  it("reads no headers for a source it has no rule for", () => {
    expect(vercelHeaders("/nowhere")).toEqual({});
  });
});

describe("previewSecurityHeaders", () => {
  it("sets the catch-all headers on a preview response before passing it on", () => {
    const use = vi.fn();
    const hook = previewSecurityHeaders().configurePreviewServer;

    if (typeof hook !== "function") {
      throw new Error("configurePreviewServer is not a function");
    }

    hook.call(
      {} as ThisParameterType<typeof hook>,
      { middlewares: { use } } as unknown as PreviewServer,
    );

    const response = { setHeader: vi.fn() };
    const next = vi.fn();
    use.mock.calls[0][0]({}, response, next);

    const headers = vercelHeaders(CATCH_ALL_SOURCE);
    expect(headers).toHaveProperty("Content-Security-Policy");
    expect(Object.fromEntries(response.setHeader.mock.calls)).toEqual(headers);
    expect(next).toHaveBeenCalledOnce();
    expect(
      Math.max(...response.setHeader.mock.invocationCallOrder),
    ).toBeLessThan(next.mock.invocationCallOrder[0]);
  });

  it("leaves the dev server without the headers", () => {
    expect(previewSecurityHeaders().configureServer).toBeUndefined();
  });

  it("comes before the API plugin, so the API's responses carry the headers", () => {
    const names = pluginNames();

    expect(names).toContain("preview-security-headers");
    expect(names.indexOf("preview-security-headers")).toBeLessThan(
      names.indexOf("endstep-api"),
    );
  });
});

describe("previewDeckPage", () => {
  type Middleware = (
    req: { url: string; method: string; headers: { host: string } },
    res: { statusCode: number; setHeader: Mock; end: Mock },
    next: Mock,
  ) => Promise<void>;

  type Address = { address: string; family: string; port: number } | null;

  function middleware(
    address: Address = { address: "127.0.0.1", family: "IPv4", port: 4196 },
    https = false,
  ): Middleware {
    const use = vi.fn();
    const hook = previewDeckPage().configurePreviewServer;

    if (typeof hook !== "function") {
      throw new Error("configurePreviewServer is not a function");
    }

    hook.call(
      {} as ThisParameterType<typeof hook>,
      {
        middlewares: { use },
        httpServer: { address: () => address },
        config: { preview: { https: https ? {} : undefined } },
      } as unknown as PreviewServer,
    );

    return use.mock.calls[0][0];
  }

  function response(): { statusCode: number; setHeader: Mock; end: Mock } {
    return { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
  }

  it("serves a deck page through the function, with the rewrite from vercel.json", async () => {
    deckPageFetch.mockResolvedValueOnce(
      new Response("<html>", {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }),
    );
    const res = response();
    const next = vi.fn();

    await middleware()(
      {
        url: "/decks/affinity-e93f5f74?window=7d",
        method: "GET",
        headers: { host: "localhost:4196" },
      },
      res,
      next,
    );

    const req = deckPageFetch.mock.calls[0][0];
    expect(req.url).toBe(
      "http://127.0.0.1:4196/api/deck-page?window=7d&slug=affinity-e93f5f74",
    );
    expect(req.method).toBe("GET");
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith("cache-control", "no-store");
    expect(String(res.end.mock.calls[0][0])).toBe("<html>");
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    "/",
    "/matchups",
    "/what-to-play",
    "/decks/",
    "/decks/a/b",
    "/decksx/abc",
    "//evil.example/decks/abc",
    "http://[",
    "/api/metagame/Pauper/decks",
  ])("passes %s on, as the rewrite in vercel.json would", async (url) => {
    const next = vi.fn();

    await middleware()(
      { url, method: "GET", headers: { host: "localhost:4196" } },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(deckPageFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["a malformed Host", "/decks/affinity-e93f5f74", "["],
    ["another host in the Host header", "/decks/abc", "evil.example"],
  ])(
    "fetches from the preview server's own address for %s",
    async (_, url, host) => {
      deckPageFetch.mockResolvedValueOnce(new Response("<html>"));
      const res = response();
      const next = vi.fn();

      await middleware()({ url, method: "GET", headers: { host } }, res, next);

      expect(new URL(deckPageFetch.mock.calls[0][0].url).origin).toBe(
        "http://127.0.0.1:4196",
      );
      expect(res.statusCode).toBe(200);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an IPv4 address", "127.0.0.1", "IPv4", false, "http://127.0.0.1:4196"],
    ["an IPv6 address", "::1", "IPv6", false, "http://[::1]:4196"],
    ["every IPv4 address", "0.0.0.0", "IPv4", false, "http://127.0.0.1:4196"],
    ["every IPv6 address", "::", "IPv6", false, "http://[::1]:4196"],
    ["https", "127.0.0.1", "IPv4", true, "https://127.0.0.1:4196"],
  ])(
    "fetches from a reachable origin when the server listens on %s",
    async (_, ip, family, https, origin) => {
      deckPageFetch.mockResolvedValueOnce(new Response("<html>"));

      await middleware({ address: ip, family, port: 4196 }, https)(
        { url: "/decks/abc", method: "GET", headers: { host: "localhost" } },
        response(),
        vi.fn(),
      );

      expect(new URL(deckPageFetch.mock.calls[0][0].url).origin).toBe(origin);
    },
  );

  it("passes the request on when the server has no address yet", async () => {
    const next = vi.fn();

    await middleware(null)(
      { url: "/decks/abc", method: "GET", headers: { host: "localhost" } },
      response(),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(deckPageFetch).not.toHaveBeenCalled();
  });

  it("passes a function that throws to the error handler and never rejects", async () => {
    deckPageFetch.mockRejectedValueOnce(new Error("no dist"));
    const next = vi.fn();

    await expect(
      middleware()(
        { url: "/decks/abc", method: "GET", headers: { host: "localhost" } },
        response(),
        next,
      ),
    ).resolves.toBeUndefined();

    expect(deckPageFetch).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toEqual(new Error("no dist"));
  });

  it("leaves the dev server on its own index.html", () => {
    expect(previewDeckPage().configureServer).toBeUndefined();
  });

  it("comes after the security headers, so the deck pages carry them", () => {
    const names = pluginNames();

    expect(names).toContain("preview-deck-page");
    expect(names.indexOf("preview-security-headers")).toBeLessThan(
      names.indexOf("preview-deck-page"),
    );
  });
});

describe("pagePreviews", () => {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const files: Record<string, string> = {};
  let plainIndex = "";
  let outDirs: string[] = [];

  function head(file: string, pattern: RegExp): string[] {
    return [...files[file].matchAll(pattern)].map((match) => match[0]);
  }

  function inlineScripts(page: string): string[] {
    return [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attributes]) => !attributes.includes("src="))
      .map(([, , body]) => body);
  }

  beforeAll(async () => {
    const [withPlugin, withoutPlugin] = await Promise.all([
      mkdtemp(join(tmpdir(), "page-previews-")),
      mkdtemp(join(tmpdir(), "page-previews-plain-")),
    ]);
    outDirs = [withPlugin, withoutPlugin];

    await build({
      root,
      configFile: join(root, "vite.config.ts"),
      logLevel: "silent",
      build: { outDir: withPlugin, emptyOutDir: true },
    });
    await build({
      ...config,
      root,
      configFile: false,
      logLevel: "silent",
      plugins: (config.plugins ?? [])
        .flat()
        .filter(
          (plugin) =>
            !(
              typeof plugin === "object" &&
              plugin !== null &&
              "name" in plugin &&
              plugin.name === "page-previews"
            ),
        ),
      build: { ...config.build, outDir: withoutPlugin, emptyOutDir: true },
    });

    for (const file of [
      "index.html",
      "matchups.html",
      "what-to-play.html",
      "staples.html",
    ]) {
      files[file] = await readFile(join(withPlugin, file), "utf8");
    }
    plainIndex = await readFile(join(withoutPlugin, "index.html"), "utf8");
  }, 60_000);

  afterAll(async () => {
    await Promise.all(
      outDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it.each(PAGE_PREVIEWS)(
    "writes $path with its title, description, og:title, og:description, canonical link and og:url",
    ({ path, title, description }) => {
      const file = `${path.slice(1)}.html`;
      const fullTitle = `${title} · Pauper Endstep metagame`;
      const address = `https://pauper-endstep-metagame.vercel.app${path}`;

      expect(head(file, /<title>[^<]*<\/title>/g)).toEqual([
        `<title>${fullTitle}</title>`,
      ]);
      expect(files[file]).toContain(
        `<meta name="description" content="${description}" />`,
      );
      expect(files[file]).toContain(
        `<meta property="og:title" content="${fullTitle}" />`,
      );
      expect(files[file]).toContain(
        `<meta property="og:description" content="${description}" />`,
      );
      expect(head(file, /<link rel="canonical"[^>]*>/g)).toEqual([
        `<link rel="canonical" href="${address}" />`,
      ]);
      expect(head(file, /<meta property="og:url"[^>]*>/g)).toEqual([
        `<meta property="og:url" content="${address}" />`,
      ]);
    },
  );

  it.each(PAGE_PREVIEWS)(
    "keeps the image of the site card in $path",
    ({ path }) => {
      const image = /<meta\s+property="og:image"\s+content="([^"]*)"/;

      expect(image.exec(files[`${path.slice(1)}.html`])?.[1]).toBe(
        "https://pauper-endstep-metagame.vercel.app/site-card.png",
      );
    },
  );

  it("leaves index.html as a build without the plugin writes it", () => {
    expect(files["index.html"]).toBe(plainIndex);
    expect(files["index.html"]).not.toContain('rel="canonical"');
  });

  it("keeps the inline theme script the same in all four files, so its hash in the security policy holds", () => {
    const [theme] = inlineScripts(files["index.html"]);

    expect(theme).toContain('localStorage.getItem("theme")');
    for (const page of Object.values(files)) {
      expect(inlineScripts(page)).toEqual([theme]);
    }
  });

  it("titles each page with the English heading the page shows", () => {
    const headings: Record<string, string> = {
      "/matchups": locales.en.translation.matchups.title,
      "/what-to-play": locales.en.translation.whatToPlay.title,
      "/staples": locales.en.translation.staples.title,
    };

    expect(
      Object.fromEntries(PAGE_PREVIEWS.map(({ path, title }) => [path, title])),
    ).toEqual(headings);
  });

  it("uses the origin and the site name of the app", () => {
    expect(SITE_ORIGIN).toBe(APP_ORIGIN);
    expect(SITE_NAME).toBe(APP_NAME);
  });

  it("runs only at build time", () => {
    expect(pagePreviews().apply).toBe("build");
  });
});
