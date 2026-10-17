import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import matrix from "../../test/fixtures/matchups.json";
import type { MatchupMatrix } from "../api/types";
import { MatchupGrid } from "./MatchupGrid";

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
          element={
            <MatchupGrid
              rows={MATRIX.decks}
              columns={MATRIX.decks}
              cells={MATRIX.cells}
              label="Top 4 decks"
            />
          }
        />
        <Route path="*" element={<Address />} />
      </Routes>
    </MemoryRouter>,
  );
}

type SpotlightOptions = {
  spotlight: string;
  reveal?: boolean;
  onReveal?: () => void;
};

function renderSpotlight({
  spotlight,
  reveal,
  onReveal,
}: SpotlightOptions): void {
  render(
    <MemoryRouter initialEntries={["/matchups?window=30d"]}>
      <MatchupGrid
        rows={MATRIX.decks}
        columns={MATRIX.decks}
        cells={MATRIX.cells}
        label="Top 4 decks"
        spotlight={spotlight}
        reveal={reveal}
        onReveal={onReveal}
      />
    </MemoryRouter>,
  );
}

function stubWidth(wide: boolean): ReturnType<typeof vi.fn> {
  const matchMedia = vi.fn((query: string) => ({
    matches: wide,
    media: query,
  }));
  vi.stubGlobal("matchMedia", matchMedia);

  return matchMedia;
}

function stubScroll(): ReturnType<typeof vi.fn> {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;

  return scrollIntoView;
}

function tabStop(): Element {
  const stops = screen.getByRole("grid").querySelectorAll("[tabindex='0']");
  expect(stops).toHaveLength(1);

  return stops[0];
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

function renderRow(): void {
  const [affinity, ...others] = MATRIX.decks;

  render(
    <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=30d"]}>
      <MatchupGrid
        rows={[affinity]}
        columns={others}
        cells={MATRIX.cells}
        label="Affinity against the top 4"
        linkRows={false}
      />
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

describe("MatchupGrid", () => {
  it("lays the decks out against each other, in share order, with links to their pages", () => {
    renderTable();

    const grid = screen.getByRole("grid", { name: "Top 4 decks" });
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
      cell(
        "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
      ).textContent,
    ).toBe("");
    expect(
      cell(
        "Naya Gates against Affinity: too few to call, 18 of the 20 matches needed",
      ),
    ).toBeTruthy();
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
    expect(focused()).toBe(
      "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
    );

    press("ArrowUp");
    expect(focused()).toBe("Naya Gates");

    press("ArrowRight");
    expect(focused()).toBe("Naya Gates");
  });

  it("leaves a key with a modifier to the browser, such as Alt and an arrow for back", () => {
    renderTable();

    focus(screen.getByRole("grid").querySelector("[tabindex='0']"));
    const event = new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.activeElement?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(focused()).toBe(
      "Affinity against Mono Red Madness: 57%, clear result",
    );
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

    focus(
      cell(
        "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
      ),
    );
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

  it("lays one deck out against the others, with no link on its own name and no mirror", () => {
    renderRow();

    const grid = screen.getByRole("grid", {
      name: "Affinity against the top 4",
    });
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(3);
    expect(within(grid).getByRole("rowheader").textContent).toBe("Affinity");
    expect(
      within(within(grid).getByRole("rowheader")).queryByRole("link"),
    ).toBeNull();
    expect(screen.queryByRole("gridcell", { name: /mirror/ })).toBeNull();
  });

  it("starts the tab stop on the first cell of a row with no mirror, and moves within it", () => {
    renderRow();

    const stops = screen.getByRole("grid").querySelectorAll("[tabindex='0']");
    expect(stops).toHaveLength(1);
    focus(stops[0]);
    expect(focused()).toBe(
      "Affinity against Mono Red Madness: 57%, clear result",
    );

    press("End");
    expect(focused()).toBe(
      "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
    );
    press("ArrowDown");
    expect(focused()).toBe(
      "Affinity against Naya Gates: too few to call, 18 of the 20 matches needed",
    );
    press("ArrowUp");
    expect(focused()).toBe("Naya Gates");
    press("Home");
    expect(focused()).toBe("Mono Red Madness");
  });

  it("puts the tab stop on the row's name when there is no cell", () => {
    const [affinity] = MATRIX.decks;
    render(
      <MemoryRouter>
        <MatchupGrid
          rows={[affinity]}
          columns={[]}
          cells={MATRIX.cells}
          label="Affinity alone"
          linkRows={false}
        />
      </MemoryRouter>,
    );

    const stops = screen.getByRole("grid").querySelectorAll("[tabindex='0']");
    expect(stops).toHaveLength(1);
    expect(stops[0].textContent).toBe("Affinity");
  });

  it("puts a deck's row and column in the spotlight, and fades every other cell", () => {
    renderSpotlight({ spotlight: "monster-tron-1bc68613" });

    const grid = screen.getByRole("grid");
    expect(grid.closest(".matchup")?.className).toContain("matchup--spotlit");
    expect(
      screen.getByRole("rowheader", { name: "Monster Tron" }).className,
    ).toContain("matchup__row--spotlit");
    expect(
      screen.getByRole("columnheader", { name: "Monster Tron" }).className,
    ).toContain("matchup__col--spotlit");
    expect(grid.querySelectorAll(".matchup__row--spotlit")).toHaveLength(1);
    expect(grid.querySelectorAll(".matchup__col--spotlit")).toHaveLength(1);
    expect(
      screen
        .getAllByRole("gridcell")
        .filter((element) => element.className.includes("--spotlit"))
        .map((element) => element.getAttribute("aria-label")?.split(":")[0]),
    ).toEqual([
      "Affinity against Monster Tron",
      "Mono Red Madness against Monster Tron",
      "Monster Tron against Affinity",
      "Monster Tron against Mono Red Madness",
      "Monster Tron against Monster Tron",
      "Monster Tron against Naya Gates",
      "Naya Gates against Monster Tron",
    ]);
  });

  it("has no spotlight for a deck it does not list", () => {
    renderSpotlight({ spotlight: "elves-00000000" });

    const grid = screen.getByRole("grid");
    expect(grid.closest(".matchup")?.className).not.toContain(
      "matchup--spotlit",
    );
    expect(grid.querySelectorAll("[class*='--spotlit']")).toHaveLength(0);
  });

  it("neither scrolls nor moves the tab stop without a reveal", () => {
    stubWidth(true);
    const scrollIntoView = stubScroll();
    renderSpotlight({ spotlight: "monster-tron-1bc68613" });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(tabStop().getAttribute("aria-label")).toBe(
      "Affinity against Mono Red Madness: 57%, clear result",
    );
  });

  it("from 1,100px reveals the deck's row: scrolls to its name and moves the tab stop there, without focus", () => {
    const matchMedia = stubWidth(true);
    const scrollIntoView = stubScroll();
    const onReveal = vi.fn();
    renderSpotlight({
      spotlight: "monster-tron-1bc68613",
      reveal: true,
      onReveal,
    });

    const name = screen.getByRole("rowheader", { name: "Monster Tron" });
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1100px)");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(name);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      inline: "nearest",
    });
    expect(tabStop()).toBe(name);
    expect(document.activeElement).toBe(document.body);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("below 1,100px reveals the deck's column: scrolls to its name and moves the tab stop there, without focus", () => {
    stubWidth(false);
    const scrollIntoView = stubScroll();
    const onReveal = vi.fn();
    renderSpotlight({
      spotlight: "monster-tron-1bc68613",
      reveal: true,
      onReveal,
    });

    const name = screen.getByRole("columnheader", { name: "Monster Tron" });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(name);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "start",
    });
    expect(tabStop()).toBe(name);
    expect(document.activeElement).toBe(document.body);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("reports a reveal of a deck it does not list, with no scroll", () => {
    stubWidth(true);
    const scrollIntoView = stubScroll();
    const onReveal = vi.fn();
    renderSpotlight({ spotlight: "elves-00000000", reveal: true, onReveal });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(tabStop().getAttribute("aria-label")).toBe(
      "Affinity against Mono Red Madness: 57%, clear result",
    );
  });
});
