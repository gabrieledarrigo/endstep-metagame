import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../api/types";
import { DeckPicker } from "./DeckPicker";

const { decks } = matrix as MatchupMatrix;

function options(): string[] {
  return within(screen.getByRole("combobox", { name: "Deck" }))
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

describe("DeckPicker", () => {
  it("lists All decks, then the decks in their order, with All decks chosen by default", () => {
    render(<DeckPicker decks={decks} value={null} onChange={vi.fn()} />);

    expect(options()).toEqual([
      "All decks",
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
      "Naya Gates",
    ]);
    expect(
      screen.getByRole<HTMLOptionElement>("option", { name: "All decks" })
        .selected,
    ).toBe(true);
  });

  it("shows the chosen deck", () => {
    render(
      <DeckPicker
        decks={decks}
        value="monster-tron-1bc68613"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole<HTMLOptionElement>("option", { name: "Monster Tron" })
        .selected,
    ).toBe(true);
  });

  it("gives the chosen slug, or null for All decks", () => {
    const onChange = vi.fn();
    render(
      <DeckPicker
        decks={decks}
        value="affinity-e93f5f74"
        onChange={onChange}
      />,
    );
    const picker = screen.getByRole("combobox", { name: "Deck" });

    fireEvent.change(picker, { target: { value: "naya-gates-af060ab8" } });
    fireEvent.change(picker, { target: { value: "" } });

    expect(onChange.mock.calls).toEqual([["naya-gates-af060ab8"], [null]]);
  });

  it("shows a deck outside the top decks as an extra first option, chosen", () => {
    render(
      <DeckPicker
        decks={decks}
        value="stompy-12345678"
        missing={{ slug: "stompy-12345678", name: "Mono Green Stompy" }}
        onChange={vi.fn()}
      />,
    );

    expect(options()).toEqual([
      "Mono Green Stompy (not in the top 4)",
      "All decks",
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
      "Naya Gates",
    ]);
    expect(
      screen.getByRole<HTMLOptionElement>("option", {
        name: "Mono Green Stompy (not in the top 4)",
      }).selected,
    ).toBe(true);
  });

  it("leaves out All decks when stacked, for the list on a phone", () => {
    render(
      <DeckPicker
        decks={decks}
        value="affinity-e93f5f74"
        stacked
        onChange={vi.fn()}
      />,
    );

    expect(options()).toEqual([
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
      "Naya Gates",
    ]);
    expect(
      screen.getByRole<HTMLOptionElement>("option", { name: "Affinity" })
        .selected,
    ).toBe(true);
  });

  it("keeps a deck outside the top decks as the first option when stacked", () => {
    render(
      <DeckPicker
        decks={decks}
        value="stompy-12345678"
        missing={{ slug: "stompy-12345678", name: "Mono Green Stompy" }}
        stacked
        onChange={vi.fn()}
      />,
    );

    expect(options()).toEqual([
      "Mono Green Stompy (not in the top 4)",
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
      "Naya Gates",
    ]);
  });
});
