import { fireEvent, render, screen, within } from "@testing-library/react";
import { type Ref, createRef } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import staples from "../../../test/fixtures/staples.json";
import type { StaplesResponse } from "../../api/types";
import { Staple } from "./Staple";

const RESPONSE = staples as StaplesResponse;
const [BOLT, COUNTERSPELL, , , FAMILIAR, VAULT] = RESPONSE.cards;
const TOP = BOLT.share;

function renderLine(
  card = BOLT,
  place = 1,
  ref?: Ref<HTMLButtonElement>,
): HTMLElement {
  render(
    <MemoryRouter initialEntries={["/staples?window=30d"]}>
      <ol>
        <Staple card={card} place={place} top={TOP} ref={ref} />
      </ol>
    </MemoryRouter>,
  );

  return screen.getAllByRole("listitem")[0];
}

function panelOf(button: HTMLElement): HTMLElement {
  return document.getElementById(
    button.getAttribute("aria-controls") ?? "",
  ) as HTMLElement;
}

describe("Staple", () => {
  it("shows the place, the name, where the card is core, its share and its copies", () => {
    const line = renderLine();

    expect(line.querySelector(".staple__row")?.textContent).toBe(
      "1Lightning BoltCore in Red Madness, Mono Red Rally and 2 more23.7%, 3.9 copies",
    );
  });

  it("names three core decks in full", () => {
    const line = renderLine(FAMILIAR, 5);

    expect(
      within(line).getByText(
        "Core in Orzhov Blade, Jund Wildfire and Affinity",
      ),
    ).toBeTruthy();
  });

  it("shows the card's Scryfall art as decoration, sized to hold its place", () => {
    const line = renderLine();
    const art = within(line).getByRole("presentation");

    expect(art.getAttribute("src")).toBe(BOLT.art?.imageUrl);
    expect(art.getAttribute("alt")).toBe("");
    expect(art.getAttribute("loading")).toBe("lazy");
    expect(art.getAttribute("width")).toBe("120");
    expect(art.getAttribute("height")).toBe("88");
  });

  it("falls back to Endstep's art crop when Scryfall found no art", () => {
    const line = renderLine(VAULT, 6);

    expect(within(line).getByRole("presentation").getAttribute("src")).toBe(
      "https://endstep.cc/api/cards/image?name=Vault+of+Whispers&version=art_crop",
    );
  });

  it("scales the bar to the top card's share and hides it from assistive technology", () => {
    const line = renderLine(COUNTERSPELL, 2);
    const bar = line.querySelector<HTMLElement>(".staple__bar");
    const fill = line.querySelector<HTMLElement>(".staple__fill");

    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    expect(fill?.style.width).toBe(`${(COUNTERSPELL.share / TOP) * 100}%`);
    expect(Number.parseFloat(fill?.style.width ?? "")).toBeCloseTo(93.29, 2);
  });

  it("fills the top card's bar", () => {
    const line = renderLine();

    expect(line.querySelector<HTMLElement>(".staple__fill")?.style.width).toBe(
      "100%",
    );
  });

  it("names its button after the card, closed, with a hidden panel in the page", () => {
    renderLine(COUNTERSPELL, 2);
    const button = screen.getByRole("button", { name: "Counterspell" });
    const panel = panelOf(button);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel).toBeTruthy();
    expect(panel.hidden).toBe(true);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens the decks behind the card under its line, and closes them again", () => {
    const line = renderLine(COUNTERSPELL, 2);
    const button = screen.getByRole("button", { name: "Counterspell" });

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(panelOf(button).hidden).toBe(false);
    expect(line.contains(panelOf(button))).toBe(true);
    expect(within(line).getByText("Played in 7 of the top 24")).toBeTruthy();
    expect(
      within(line)
        .getByRole("link", { name: "Dimir Control" })
        .getAttribute("href"),
    ).toBe("/decks/dimir-control-6306a72e?window=30d");

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panelOf(button).hidden).toBe(true);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps focus on the button that opened or closed the panel", () => {
    renderLine(COUNTERSPELL, 2);
    const button = screen.getByRole("button", { name: "Counterspell" });
    button.focus();

    fireEvent.click(button);
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
  });

  it("gives each line's panel its own id", () => {
    render(
      <MemoryRouter>
        <ol>
          <Staple card={BOLT} place={1} top={TOP} />
          <Staple card={COUNTERSPELL} place={2} top={TOP} />
        </ol>
      </MemoryRouter>,
    );
    const [bolt, counterspell] = screen.getAllByRole("button");

    expect(bolt.getAttribute("aria-controls")).not.toBe(
      counterspell.getAttribute("aria-controls"),
    );
  });

  it("hands its parent the name button through the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    const line = renderLine(BOLT, 31, ref);

    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Lightning Bolt" }),
    );
    expect(line.getAttribute("tabindex")).toBeNull();
  });
});
