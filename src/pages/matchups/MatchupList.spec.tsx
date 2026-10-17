import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../../api/types";
import { MatchupList, MatchupListSkeleton } from "./MatchupList";

const MATRIX = matrix as MatchupMatrix;
const [AFFINITY, MADNESS] = MATRIX.decks;

function renderList(
  props: Partial<Parameters<typeof MatchupList>[0]> = {},
): void {
  render(
    <MemoryRouter initialEntries={["/matchups?window=7d"]}>
      <MatchupList matrix={MATRIX} deck={AFFINITY} timeWindow="7d" {...props} />
    </MemoryRouter>,
  );
}

function lines(): string[] {
  return within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) =>
      Array.from(item.querySelectorAll("a, span"))
        .filter((element) => element.children.length === 0)
        .map((element) => element.textContent)
        .join(" | "),
    );
}

describe("MatchupList", () => {
  it("lists the deck's matchups against the other decks in share order, in a list named for the window", () => {
    renderList();

    expect(
      screen.getByRole("list", {
        name: "Match win rate of Affinity against the other 3 decks in the top 4, 7d window, rated.",
      }),
    ).toBeTruthy();
    expect(lines()).toEqual([
      "Mono Red Madness | 1,456 matches | Favoured | 57",
      "Monster Tron | 998 matches | Within chance | 48",
      "Naya Gates | 18 of the 20 matches needed | Too few to call | ",
    ]);
  });

  it("names no window when given none, as while another window loads", () => {
    renderList({ timeWindow: undefined });

    expect(
      screen.getByRole("list", {
        name: "Match win rate of Affinity against the other 3 decks in the top 4, rated.",
      }),
    ).toBeTruthy();
  });

  it("says unfavoured, and no data with no matches line for a pair with no entry", () => {
    renderList({ deck: MADNESS });

    expect(lines()).toEqual([
      "Affinity | 1,456 matches | Unfavoured | 43",
      "Monster Tron | 703 matches | Within chance | 52",
      "Naya Gates | No data | ·",
    ]);
    expect(screen.getByText("·").getAttribute("aria-hidden")).toBe("true");
  });

  it("counts a single match as one match", () => {
    const cell = {
      wins: 1,
      losses: 0,
      matches: 1,
      gate: null,
      rate: 1,
      low: 0.2,
      high: 1,
    };
    renderList({
      matrix: {
        ...MATRIX,
        cells: {
          [AFFINITY.slug]: { [MADNESS.slug]: cell },
        },
      },
    });

    expect(screen.getByText("1 match")).toBeTruthy();
  });

  it("links each opponent to its deck page, keeping the window", () => {
    renderList();

    expect(
      screen.getByRole("link", { name: "Monster Tron" }).getAttribute("href"),
    ).toBe("/decks/monster-tron-1bc68613?window=7d");
  });

  it("prints the notice it is given above the list, as a plain line", () => {
    renderList({
      notice:
        "Mono Green Stompy isn't in the top 4 for the selected time window. The table shows Affinity by default.",
    });

    expect(
      screen.getByText(
        "Mono Green Stompy isn't in the top 4 for the selected time window. The table shows Affinity by default.",
      ).tagName,
    ).toBe("P");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows no notice when given none", () => {
    renderList();

    expect(screen.queryByText(/isn't in the top/)).toBeNull();
  });
});

describe("MatchupListSkeleton", () => {
  it("marks itself busy and lists nothing", () => {
    const { container } = render(<MatchupListSkeleton />);

    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
