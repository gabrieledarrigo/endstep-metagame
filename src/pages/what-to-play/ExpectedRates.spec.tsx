import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../../api/types";
import { rankDecks } from "../../helpers";
import { ExpectedRates, ExpectedRatesSkeleton } from "./ExpectedRates";

const MATRIX = matrix as MatchupMatrix;
const RANKING = rankDecks(
  MATRIX,
  Object.fromEntries(MATRIX.decks.map((deck) => [deck.slug, deck.share])),
);

function renderAt(ui: ReactElement): HTMLElement {
  const { container } = render(
    <MemoryRouter initialEntries={["/what-to-play?window=7d"]}>
      {ui}
    </MemoryRouter>,
  );

  return container;
}

describe("ExpectedRates", () => {
  it("lists every deck by expected rate, each read as its place, the deck, the rate and its range", () => {
    renderAt(<ExpectedRates ranking={RANKING} period="the last 7 days" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Expected match win rate",
      }),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("list"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "1Affinity51.7%, likely between 48.7% and 54.6%",
      "2Monster Tron50.3%, likely between 46.9% and 53.7%",
      "3Naya Gates50.0%, likely between 22.3% and 77.7%",
      "4Mono Red Madness47.5%, likely between 44.4% and 50.7%",
    ]);
  });

  it("links every deck to its page with the current window", () => {
    renderAt(<ExpectedRates ranking={RANKING} period="the last 7 days" />);

    expect(
      screen.getByRole("link", { name: "Naya Gates" }).getAttribute("href"),
    ).toBe("/decks/naya-gates-af060ab8?window=7d");
  });

  it("names the metagame's period beside the title, and says the colours in words", () => {
    renderAt(<ExpectedRates ranking={RANKING} period="the last 7 days" />);

    expect(screen.getByText("Metagame of the last 7 days")).toBeTruthy();
    expect(screen.getByText("Clearly above 50%")).toBeTruthy();
    expect(screen.getByText("Too close to call")).toBeTruthy();
    expect(screen.getByText("Clearly below 50%")).toBeTruthy();
  });

  it("leaves the period out when there is none to name", () => {
    renderAt(<ExpectedRates ranking={RANKING} />);

    expect(screen.queryByText(/Metagame of/)).toBeNull();
  });

  it("labels the shared scale every 5 points, from the lowest bound to the highest, with every other label minor", () => {
    const container = renderAt(
      <ExpectedRates ranking={RANKING} period="the last 7 days" />,
    );

    expect(
      Array.from(container.querySelectorAll(".expected__tick")).map(
        (tick) =>
          `${tick.textContent} ${(tick as HTMLElement).style.left} ${tick.classList.contains("expected__tick--minor") ? "minor" : "major"}`,
      ),
    ).toEqual([
      "20% 0% major",
      "25% 8.33% minor",
      "30% 16.67% major",
      "35% 25% minor",
      "40% 33.33% major",
      "45% 41.67% minor",
      "50% 50% major",
      "55% 58.33% minor",
      "60% 66.67% major",
      "65% 75% minor",
      "70% 83.33% major",
      "75% 91.67% minor",
      "80% 100% major",
    ]);
    expect(
      container.querySelector(".expected__axis")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("draws each deck's range bar on the shared scale, in the colour of its verdict", () => {
    const container = renderAt(
      <ExpectedRates ranking={RANKING} period="the last 7 days" />,
    );
    const first = container.querySelector(".expected__row .range-bar__span");

    expect(first?.className).toBe("range-bar__span");
    expect((first as HTMLElement).style.left).toBe("47.85%");
  });
});

describe("ExpectedRatesSkeleton", () => {
  it("keeps the title and the legend, and marks the panel busy", () => {
    const container = renderAt(<ExpectedRatesSkeleton />);

    expect(
      screen.getByRole("heading", { name: "Expected match win rate" }),
    ).toBeTruthy();
    expect(screen.getByText("Too close to call")).toBeTruthy();
    expect(
      container.querySelector(".expected")?.getAttribute("aria-busy"),
    ).toBe("true");
    expect(container.querySelector(".skeleton")).toBeTruthy();
  });
});
