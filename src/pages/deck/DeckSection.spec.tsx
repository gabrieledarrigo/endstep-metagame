import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckSection } from "./DeckSection";

describe("DeckSection", () => {
  it("names the section with its title, and adds the note", () => {
    render(
      <DeckSection title="Toss" note="Game 1 win rate after the toss.">
        <p>Tiles</p>
      </DeckSection>,
    );

    const section = screen.getByRole("region", { name: "Toss" });
    expect(section.textContent).toBe(
      "TossGame 1 win rate after the toss.Tiles",
    );
  });

  it("leaves the note out when there is none", () => {
    render(
      <DeckSection title="Sample list">
        <p>List</p>
      </DeckSection>,
    );

    expect(
      screen.getByRole("region", { name: "Sample list" }).textContent,
    ).toBe("Sample listList");
  });
});
