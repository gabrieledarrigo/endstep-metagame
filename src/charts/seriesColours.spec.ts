import { describe, expect, it, vi } from "vitest";
import { seriesColours } from "./seriesColours";

vi.mock("./theme", () => ({ token: (name: string): string => name }));

describe("seriesColours", () => {
  it("gives new keys the lowest free colours, in order", () => {
    const colours = seriesColours(["first-a", "first-b", "first-c"]);

    expect([...colours]).toEqual([
      ["first-a", "--s1"],
      ["first-b", "--s2"],
      ["first-c", "--s3"],
    ]);
  });

  it("keeps a key's colour on a later call, whatever its position", () => {
    seriesColours(["keep-a", "keep-b", "keep-c"]);

    const colours = seriesColours(["keep-c", "keep-new", "keep-a"]);

    expect(colours.get("keep-c")).toBe("--s3");
    expect(colours.get("keep-a")).toBe("--s1");
    expect(colours.get("keep-new")).toBe("--s2");
  });

  it("moves a key whose earlier colour another key in the same call holds", () => {
    seriesColours(["clash-a"]);
    seriesColours(["clash-b"]);

    const colours = seriesColours(["clash-a", "clash-b"]);

    expect(new Set(colours.values()).size).toBe(2);
    expect(colours.get("clash-a")).toBe("--s1");
    expect(colours.get("clash-b")).toBe("--s2");
  });
});
