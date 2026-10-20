import { render, screen, within } from "@testing-library/react";
import { type Ref, createRef } from "react";
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
  ref?: Ref<HTMLLIElement>,
): HTMLElement {
  render(
    <ol>
      <Staple card={card} place={place} top={TOP} ref={ref} />
    </ol>,
  );

  return screen.getByRole("listitem");
}

describe("Staple", () => {
  it("shows the place, the name, where the card is core, its share and its copies", () => {
    const line = renderLine();

    expect(line.textContent).toBe(
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

  it("can take focus from a script, and not from the Tab key, when its parent holds a ref", () => {
    const ref = createRef<HTMLLIElement>();
    const line = renderLine(BOLT, 31, ref);

    expect(ref.current).toBe(line);
    expect(line.getAttribute("tabindex")).toBe("-1");
  });

  it("is not focusable without a ref", () => {
    const line = renderLine();

    expect(line.getAttribute("tabindex")).toBeNull();
  });
});
