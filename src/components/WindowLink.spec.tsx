import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { WindowLink } from "./WindowLink";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <WindowLink to="/decks/affinity-e93f5f74" className="deck">
        Affinity
      </WindowLink>
    </MemoryRouter>,
  );

  return screen.getByRole("link", { name: "Affinity" });
}

describe("WindowLink", () => {
  it("keeps the current window", () => {
    const link = renderAt("/?window=7d");

    expect(link.getAttribute("href")).toBe(
      "/decks/affinity-e93f5f74?window=7d",
    );
  });

  it("carries the default window when the address has none", () => {
    const link = renderAt("/");

    expect(link.getAttribute("href")).toBe(
      "/decks/affinity-e93f5f74?window=30d",
    );
  });

  it("passes its other props to the link", () => {
    const link = renderAt("/?window=7d");

    expect(link.className).toBe("deck");
  });
});
