import { describe, expect, it } from "vitest";
import { readableSearch } from "./address";

describe("readableSearch", () => {
  it("keeps colons and commas readable", () => {
    const params = new URLSearchParams({
      window: "30d",
      meta: "affinity-e93f5f74:-4,elves-262fdcbd:3",
    });

    expect(readableSearch(params)).toBe(
      "window=30d&meta=affinity-e93f5f74:-4,elves-262fdcbd:3",
    );
  });

  it("encodes everything else as URLSearchParams does", () => {
    const params = new URLSearchParams({ q: "Boros + Mardu & co" });

    expect(readableSearch(params)).toBe("q=Boros+%2B+Mardu+%26+co");
  });

  it("writes an address that reads back the same", () => {
    const params = new URLSearchParams({ meta: "a-12345678:1,b-87654321:-2" });

    expect(new URLSearchParams(readableSearch(params)).get("meta")).toBe(
      "a-12345678:1,b-87654321:-2",
    );
  });

  it("writes nothing for no parameters", () => {
    expect(readableSearch(new URLSearchParams())).toBe("");
  });
});
