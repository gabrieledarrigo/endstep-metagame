import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DeckNotFound } from "./DeckNotFound";

describe("DeckNotFound", () => {
  it("says there is no such deck in the main heading, names the slug, and links to the overview in the same window", () => {
    render(
      <MemoryRouter
        initialEntries={["/decks/mono-green-stompy-0000aaaa?window=1d"]}
      >
        <DeckNotFound slug="mono-green-stompy-0000aaaa" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "No deck at this address",
      }),
    ).toBeTruthy();
    expect(document.title).toBe(
      "No deck at this address · Pauper Endstep metagame",
    );
    expect(
      screen.getByText(
        'Endstep has no Pauper deck called "mono-green-stompy-0000aaaa".',
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to the overview" })
        .getAttribute("href"),
    ).toBe("/?window=1d");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
