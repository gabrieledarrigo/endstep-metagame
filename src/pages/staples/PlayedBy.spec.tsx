import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import staples from "../../../test/fixtures/staples.json";
import type { StapleDeck, StaplesResponse } from "../../api/types";
import { PlayedBy } from "./PlayedBy";

const COUNTERSPELL = (staples as StaplesResponse).cards[1];

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {`${pathname}${search}`}</p>;
}

function renderPanel(
  decks: StapleDeck[] = COUNTERSPELL.decks,
  hidden = false,
): HTMLElement {
  const { container } = render(
    <MemoryRouter initialEntries={["/staples?window=7d"]}>
      <PlayedBy id="played-by-1" hidden={hidden} decks={decks} />
      <Address />
    </MemoryRouter>,
  );

  return container.querySelector("#played-by-1") as HTMLElement;
}

function items(): HTMLElement[] {
  return screen.getAllByRole("listitem");
}

describe("PlayedBy", () => {
  it("counts the decks behind the card and closes with its sentence", () => {
    renderPanel();

    expect(screen.getByText("Played in 7 of the top 24")).toBeTruthy();
    expect(
      screen.getByText("The share of each deck's lists that play it."),
    ).toBeTruthy();
  });

  it("lists the decks in the order of the response", () => {
    renderPanel();

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      [
        "Mono Blue Faeries",
        "Dimir Control",
        "Esper Ephemerate",
        "Blue Terror",
        "Izzet Control",
        "Naya Gates",
        "Turbo Fog",
      ],
    );
  });

  it("links each deck to its page in the window on screen", () => {
    renderPanel();

    const link = screen.getByRole("link", { name: "Dimir Control" });
    expect(link.getAttribute("href")).toBe(
      "/decks/dimir-control-6306a72e?window=7d",
    );

    fireEvent.click(link);

    expect(
      screen.getByText("Address: /decks/dimir-control-6306a72e?window=7d"),
    ).toBeTruthy();
  });

  it("gives each deck's share of its lists as a whole percentage, then its copies", () => {
    renderPanel();

    expect(items()[0].textContent).toBe(
      "Mono Blue Faeries100% of its lists, 4.0 copies",
    );
    expect(items()[5].textContent).toBe(
      "Naya Gates30% of its lists, 4.0 copies",
    );
    expect(items()[6].textContent).toBe("Turbo Fog5% of its lists, 1.9 copies");
  });

  it("scales each bar from 0% to 100% of the deck's lists and hides it from assistive technology", () => {
    renderPanel();

    const bar = items()[5].querySelector(".played-by__bar");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    expect(
      (bar?.querySelector(".played-by__fill") as HTMLElement).style.width,
    ).toBe(`${COUNTERSPELL.decks[5].playRate * 100}%`);
  });

  it("is hidden while closed, and stays in the page", () => {
    const panel = renderPanel(COUNTERSPELL.decks, true);

    expect(panel.hidden).toBe(true);
    expect(screen.queryByRole("list")).toBeNull();
    expect(within(panel).getByText("Played in 7 of the top 24")).toBeTruthy();
  });

  it("says no deck plays the card in 5% of its lists when none does", () => {
    const panel = renderPanel([]);

    expect(panel.textContent).toBe(
      "No deck plays it in 5% of its lists or more.",
    );
    expect(screen.queryByRole("list")).toBeNull();
  });
});
