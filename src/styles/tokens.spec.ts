import { describe, expect, it } from "vitest";
import tokens from "./tokens.css?raw";

function declarations(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/(--[\w-]+|color-scheme):\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  );
}

const [light, device, chosen] = tokens
  .split(/@media \(prefers-color-scheme: dark\)|:root\[data-theme="dark"\]/)
  .map(declarations);

describe("tokens", () => {
  it("gives the dark theme the same values on a dark device and by the reader's choice", () => {
    expect([...device]).toEqual([...chosen]);
  });

  it("gives every light token a dark value, except the typeface and the hatch", () => {
    const shared = [...light.keys()].filter(
      (name) => name !== "--sans" && name !== "--hatch",
    );

    expect([...chosen.keys()].sort()).toEqual(shared.sort());
  });

  it("sets the colour scheme with each theme, so native controls follow", () => {
    expect(light.get("color-scheme")).toBe("light");
    expect(chosen.get("color-scheme")).toBe("dark");
  });
});
