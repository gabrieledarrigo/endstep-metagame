import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks", () => {
  it("says in four paragraphs how the rate is counted, what the bars mean, how the pick is chosen and why the long tail is left out", () => {
    const { container } = render(<HowItWorks />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How the numbers are made",
      }),
    ).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll("p")).map((p) => p.textContent),
    ).toEqual([
      "How we count. For each deck, we take its win rate against each of the top 24 decks. We weight each one by how often you expect to meet that deck. A mirror match counts as 50%. So does a matchup with fewer than 20 matches, and it widens the bar.",
      "The bars. Each bar shows where the true rate most likely is. Blue is clearly above 50%, red is clearly below, grey is too close to call.",
      "Our pick. The deck with the best rate. When other decks are too close to tell apart, we name them too, up to three.",
      "Decks outside the top 24. About a quarter of the decks played are outside the top 24. We have no matchup data for them, so we leave them out. That is why these rates are a little lower than each deck’s overall win rate.",
    ]);
  });
});
