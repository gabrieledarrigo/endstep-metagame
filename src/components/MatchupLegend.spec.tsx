import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchupLegend } from "./MatchupLegend";

function items(): (string | null)[] {
  return within(screen.getByRole("list", { name: "Legend" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

describe("MatchupLegend", () => {
  it("states the colour rule, with a sample of each state", () => {
    render(<MatchupLegend />);

    expect(items()).toEqual([
      "62Favoured, clear result",
      "38Unfavoured, clear result",
      "53Within the range of chance",
      "Too few matches",
      "\u00b7No data",
      "Mirror",
    ]);
  });

  it("leaves the mirror out for a row that has none", () => {
    render(<MatchupLegend mirror={false} />);

    expect(items()).not.toContain("Mirror");
    expect(items()).toHaveLength(5);
  });
});
