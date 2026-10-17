import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import vercel from "./vercel.json" with { type: "json" };

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

function headersFor(source: string): Record<string, string> {
  const rule = vercel.headers.find((candidate) => candidate.source === source);

  return Object.fromEntries(
    (rule?.headers ?? []).map(({ key, value }) => [key, value]),
  );
}

function inlineScripts(page: string): string[] {
  return [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes]) => !/(^|\s)src\s*=/i.test(attributes))
    .map(([, , body]) => body);
}

function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name !== "")
      .map(([name, ...tokens]) => [name, tokens.toSorted()]),
  );
}

function sha256(text: string): string {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

describe("vercel.json", () => {
  it("caches the hashed assets for a year", () => {
    expect(headersFor("/assets/(.*)")).toEqual({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });

  it("sends the security headers on every response, with no cache rule", () => {
    const headers = headersFor("/(.*)");

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers).not.toHaveProperty("Cache-Control");
  });

  it("sends the agreed Content Security Policy", () => {
    const hashes = inlineScripts(html).map(sha256);

    expect(directives(headersFor("/(.*)")["Content-Security-Policy"])).toEqual({
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

  it("allows every inline script in index.html by its hash", () => {
    const policy = headersFor("/(.*)")["Content-Security-Policy"];

    inlineScripts(html).forEach((script) => {
      expect(policy).toContain(`script-src 'self' ${sha256(script)}`);
    });
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
