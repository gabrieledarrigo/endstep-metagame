import type { Plugin, PreviewServer } from "vite";
import { describe, expect, it, vi } from "vitest";
import config, {
  previewSecurityHeaders,
  vercelHeaders,
} from "./vite.config.ts";

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

    const headers = vercelHeaders("/(.*)");
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
