import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../../api/types";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

describe("MatchupTable", () => {
  it("lays every deck against every other in a grid named for the window, with the full legend", () => {
    render(
      <MemoryRouter>
        <MatchupTable matrix={matrix as MatchupMatrix} timeWindow="30d" />
      </MemoryRouter>,
    );

    const grid = screen.getByRole("grid", {
      name: "Match win rate of the row deck against the column deck. Top 4 decks by share, 30d window, rated.",
    });
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(16);
    expect(
      within(screen.getByRole("list", { name: "Legend" })).getByText("Mirror"),
    ).toBeTruthy();
  });
});

describe("MatchupTableSkeleton", () => {
  it("keeps the legend, and marks the band as busy", () => {
    const { container } = render(<MatchupTableSkeleton />);

    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("list", { name: "Legend" })).toBeTruthy();
    expect(screen.queryByRole("grid")).toBeNull();
  });
});
