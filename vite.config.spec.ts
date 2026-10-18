import type { Plugin, PreviewServer } from "vite";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import config, {
  CATCH_ALL_SOURCE,
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

  function middleware(): Middleware {
    const use = vi.fn();
    const hook = previewDeckPage().configurePreviewServer;

    if (typeof hook !== "function") {
      throw new Error("configurePreviewServer is not a function");
    }

    hook.call(
      {} as ThisParameterType<typeof hook>,
      { middlewares: { use } } as unknown as PreviewServer,
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
      "http://localhost:4196/api/deck-page?window=7d&slug=affinity-e93f5f74",
    );
    expect(req.method).toBe("GET");
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith("cache-control", "no-store");
    expect(String(res.end.mock.calls[0][0])).toBe("<html>");
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["/", "/matchups", "/decks/a/b", "/api/metagame/Pauper/decks"])(
    "passes %s on",
    async (url) => {
      const next = vi.fn();

      await middleware()(
        { url, method: "GET", headers: { host: "localhost:4196" } },
        response(),
        next,
      );

      expect(next).toHaveBeenCalledOnce();
      expect(deckPageFetch).not.toHaveBeenCalled();
    },
  );

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
