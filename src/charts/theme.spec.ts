import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  document.documentElement.removeAttribute("style");
  vi.resetModules();
});

describe("token", () => {
  it("reads a custom property from the root element, without spaces", async () => {
    document.documentElement.style.setProperty("--s1", " #1c5cab ");
    const { token } = await import("./theme");

    expect(token("--s1")).toBe("#1c5cab");
  });

  it("returns an empty string for a property that is not set", async () => {
    const { token } = await import("./theme");

    expect(token("--missing")).toBe("");
  });
});
