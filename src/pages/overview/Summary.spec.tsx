import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import decks from "../../../test/fixtures/decks.json";
import type { DecksResponse } from "../../api/types";
import { Summary, SummarySkeleton } from "./Summary";

function tiles(): [string | null, string | null][] {
  return screen
    .getAllByRole("term")
    .map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent ?? null,
    ]);
}

describe("Summary", () => {
  it("shows the totals, the archetype count, the window's dates and the population", () => {
    render(<Summary decks={decks as DecksResponse} />);

    expect(tiles()).toEqual([
      ["Registrations", "236,728"],
      ["Players", "8,355"],
      ["Archetypes", "252"],
      ["Window", "6 Sep to 5 Oct 2026"],
      ["Population", "Rated"],
    ]);
  });
});

describe("SummarySkeleton", () => {
  it("keeps the labels and hides the values behind placeholders, marked as busy", () => {
    const { container } = render(<SummarySkeleton />);

    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
    expect(tiles()).toEqual([
      ["Registrations", ""],
      ["Players", ""],
      ["Archetypes", ""],
      ["Window", ""],
      ["Population", ""],
    ]);
  });
});
