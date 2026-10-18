import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATCH_ALL_SOURCE, vercelHeaders } from "./vite.config.ts";
import vercel from "./vercel.json" with { type: "json" };

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

function inlineScripts(page: string): string[] {
  return [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes]) => !/(^|\s)src\s*=/i.test(attributes))
    .map(([, , body]) => body);
}

function directiveList(policy: string): [string, string[]][] {
  return policy
    .split(";")
    .map((directive) => directive.trim().split(/\s+/))
    .filter(([name]) => name !== "")
    .map(([name, ...tokens]) => [name.toLowerCase(), tokens.toSorted()]);
}

function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(directiveList(policy));
}

function sha256(text: string): string {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

describe("vercel.json", () => {
  it("sends a deck page to the deck page's function, with the built page deployed beside it", () => {
    expect(vercel.rewrites).toContainEqual({
      source: "/decks/:slug",
      destination: "/api/deck-page?slug=:slug",
    });
    expect(vercel.functions["api/deck-page.ts"]).toEqual({
      includeFiles: "dist/index.html",
    });
  });

  it("serves the matchup table and What to play? from the built page", () => {
    expect(vercel.rewrites).toContainEqual({
      source: "/matchups",
      destination: "/index.html",
    });
    expect(vercel.rewrites).toContainEqual({
      source: "/what-to-play",
      destination: "/index.html",
    });
  });

  it("caches the hashed assets for a year", () => {
    expect(vercelHeaders("/assets/(.*)")).toEqual({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });

  it("sends the security headers on every response, with no cache rule", () => {
    const headers = vercelHeaders(CATCH_ALL_SOURCE);

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers).not.toHaveProperty("Cache-Control");
  });

  it("names each directive of the policy once", () => {
    const names = directiveList(
      vercelHeaders(CATCH_ALL_SOURCE)["Content-Security-Policy"],
    ).map(([name]) => name);

    expect(names).toEqual([...new Set(names)]);
  });

  it("sends the agreed Content Security Policy", () => {
    const hashes = inlineScripts(html).map(sha256);

    expect(
      directives(vercelHeaders(CATCH_ALL_SOURCE)["Content-Security-Policy"]),
    ).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", ...hashes].toSorted(),
      "style-src": ["'self'"],
      "style-src-attr": ["'unsafe-inline'"],
      "img-src": ["'self'", "https://cards.scryfall.io", "https://endstep.cc"],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "object-src": ["'none'"],
    });
  });

  it("finds one inline script in index.html, the theme script", () => {
    const scripts = inlineScripts(html);

    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain('localStorage.getItem("theme")');
  });
});

describe("inlineScripts", () => {
  it("finds an inline script in upper case", () => {
    expect(inlineScripts("<SCRIPT>run()</SCRIPT>")).toEqual(["run()"]);
  });

  it("finds an inline script whose only src is a data attribute", () => {
    expect(inlineScripts('<script data-src="a.js">run()</script>')).toEqual([
      "run()",
    ]);
  });

  it("finds an inline script with a line break before its closing bracket", () => {
    expect(
      inlineScripts('<script\n  type="module"\n>run()</script\n>'),
    ).toEqual(["run()"]);
  });

  it("skips an external script, however its src is spaced or cased", () => {
    expect(
      inlineScripts(
        '<script src = "a.js"></script><script\nSRC="b.js"></script>',
      ),
    ).toEqual([]);
  });
});
