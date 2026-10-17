import { describe, expect, it } from "vitest";
import { seriesColours } from "./seriesColours";

describe("seriesColours", () => {
  it("gives new keys the lowest free colours, in order", () => {
    const colours = seriesColours(["first-a", "first-b", "first-c"]);

    expect([...colours]).toEqual([
      ["first-a", "var(--s1)"],
      ["first-b", "var(--s2)"],
      ["first-c", "var(--s3)"],
    ]);
  });

  it("keeps a key's colour on a later call, whatever its position", () => {
    seriesColours(["keep-a", "keep-b", "keep-c"]);

    const colours = seriesColours(["keep-c", "keep-new", "keep-a"]);

    expect(colours.get("keep-c")).toBe("var(--s3)");
    expect(colours.get("keep-a")).toBe("var(--s1)");
    expect(colours.get("keep-new")).toBe("var(--s2)");
  });

  it("moves a key whose earlier colour another key in the same call holds", () => {
    seriesColours(["clash-a"]);
    seriesColours(["clash-b"]);

    const colours = seriesColours(["clash-a", "clash-b"]);

    expect(new Set(colours.values()).size).toBe(2);
    expect(colours.get("clash-a")).toBe("var(--s1)");
    expect(colours.get("clash-b")).toBe("var(--s2)");
  });
});
