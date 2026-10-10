import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../../api/types";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

const MATRIX = matrix as MatchupMatrix;

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {pathname + search}</p>;
}

function renderTable(): void {
  render(
    <MemoryRouter initialEntries={["/matchups?window=30d"]}>
      <Routes>
        <Route
          path="/matchups"
          element={<MatchupTable matrix={MATRIX} timeWindow="30d" />}
        />
        <Route path="*" element={<Address />} />
      </Routes>
    </MemoryRouter>,
  );
}

function cell(name: string): HTMLElement {
  return screen.getByRole("gridcell", { name });
}

function focused(): string | null {
  return (
    document.activeElement?.getAttribute("aria-label") ??
    document.activeElement?.textContent ??
    null
  );
}

function focus(element: Element | null): void {
  act(() => {
    (element as HTMLElement).focus();
  });
}

function press(key: string): void {
  fireEvent.keyDown(document.activeElement as Element, { key });
}

describe("MatchupTable", () => {
  it("lays the decks out against each other, in share order, with links to their pages", () => {
    renderTable();

    const grid = screen.getByRole("grid", {
      name: "Match win rate of the row deck against the column deck. Top 4 decks by share, 30d window, rated.",
    });
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(16);
    expect(
      within(grid)
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["Affinity", "Mono Red Madness", "Monster Tron", "Naya Gates"]);
    expect(
      within(grid)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Deck",
      "Affinity",
      "Mono Red Madness",
      "Monster Tron",
      "Naya Gates",
    ]);
    expect(
      within(within(grid).getAllByRole("columnheader")[2])
        .getByRole("link")
        .getAttribute("href"),
    ).toBe("/decks/mono-red-madness-60596e8a?window=30d");
  });

  it("colours both cells of a clear pair by side, and nothing else", () => {
    renderTable();

    const favoured = cell(
      "Affinity against Mono Red Madness: 57%, clear result",
    );
    const unfavoured = cell(
      "Mono Red Madness against Affinity: 43%, clear result",
    );
    expect(favoured.textContent).toBe("57");
    expect(favoured.className).toContain("matchup__cell--win");
    expect(unfavoured.textContent).toBe("43");
    expect(unfavoured.className).toContain("matchup__cell--loss");
    expect(
      screen
        .getAllByRole("gridcell")
        .filter((element) => /--(win|loss)/.test(element.className)),
    ).toEqual([favoured, unfavoured]);
    expect(
      cell("Affinity against Monster Tron: 48%, within the range of chance")
        .textContent,
    ).toBe("48");
  });

  it("reads a gated pair as too few to call, a missing pair as no data, and the diagonal as the mirror", () => {
    renderTable();

    expect(
      cell("Affinity against Naya Gates: too few to call").textContent,
    ).toBe("");
    expect(cell("Naya Gates against Affinity: too few to call")).toBeTruthy();
    expect(
      cell("Mono Red Madness against Naya Gates: no data").textContent,
    ).toBe("·");
    expect(cell("Affinity against Affinity: mirror match").textContent).toBe(
      "",
    );
  });

  it("is one tab stop, and the arrow keys, Home and End move between cells and headers", () => {
    renderTable();

    const stops = screen.getByRole("grid").querySelectorAll("[tabindex='0']");
    expect(stops).toHaveLength(1);

    focus(stops[0]);
    expect(focused()).toBe(
      "Affinity against Mono Red Madness: 57%, clear result",
    );

    press("ArrowDown");
    press("ArrowRight");
    expect(focused()).toBe(
      "Mono Red Madness against Monster Tron: 52%, within the range of chance",
    );
    expect(
      screen.getByRole("grid").querySelectorAll("[tabindex='0']"),
    ).toHaveLength(1);

    press("Home");
    expect(focused()).toBe("Mono Red Madness");

    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
    expect(focused()).toBe("Affinity");

    press("End");
    expect(focused()).toBe("Affinity against Naya Gates: too few to call");

    press("ArrowUp");
    expect(focused()).toBe("Naya Gates");

    press("ArrowRight");
    expect(focused()).toBe("Naya Gates");
  });

  it("follows a header's link on Enter", () => {
    renderTable();

    focus(screen.getByRole("grid").querySelector("[tabindex='0']"));
    press("ArrowUp");
    press("Enter");

    expect(
      screen.getByText("Address: /decks/mono-red-madness-60596e8a?window=30d"),
    ).toBeTruthy();
  });

  it("shows a cell's detail on focus and highlights its headers, until focus leaves or Escape", () => {
    renderTable();

    focus(cell("Affinity against Mono Red Madness: 57%, clear result"));

    expect(screen.getByRole("tooltip").textContent).toBe(
      "Affinity against Mono Red MadnessMatch win rate57.1%Range53.8% to 60.3%Wins831Losses625Matches1,456Clear result. The range excludes 50%.",
    );
    expect(
      screen
        .getByRole("grid")
        .querySelectorAll(".matchup__col--active, .matchup__row--active"),
    ).toHaveLength(2);

    press("Escape");
    expect(screen.queryByRole("tooltip")).toBeNull();

    focus(cell("Affinity against Naya Gates: too few to call"));
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Affinity against Naya GatesWins8Losses10Too few to call: 18 of the 20 matches needed.",
    );

    fireEvent.blur(document.activeElement as Element, {
      relatedTarget: document.body,
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the detail of the cell under the pointer", () => {
    renderTable();

    fireEvent.mouseOver(cell("Mono Red Madness against Naya Gates: no data"));
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Mono Red Madness against Naya GatesNo data for this pair in the window.",
    );

    fireEvent.mouseOver(
      cell("Monster Tron against Monster Tron: mirror match"),
    );
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Monster Tron against Monster TronMirror match. Endstep does not list it.",
    );

    fireEvent.mouseLeave(screen.getByRole("grid"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("states the colour rule in a legend", () => {
    renderTable();

    expect(
      within(screen.getByRole("list", { name: "Legend" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "62Favoured, clear result",
      "38Unfavoured, clear result",
      "53Within the range of chance",
      "Too few matches",
      "·No data",
      "Mirror",
    ]);
  });
});

describe("MatchupTableSkeleton", () => {
  it("keeps the caption and the legend, and marks the band as busy", () => {
    const { container } = render(<MatchupTableSkeleton />);

    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText(/^Read across\./)).toBeTruthy();
    expect(screen.getByRole("list", { name: "Legend" })).toBeTruthy();
    expect(screen.queryByRole("grid")).toBeNull();
  });
});
