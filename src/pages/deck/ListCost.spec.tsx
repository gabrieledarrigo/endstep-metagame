import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import sampleCards from "../../../test/fixtures/sample-cards.json";
import type { SampleCard, SampleCardData } from "../../api/types";
import type { ListCost as ListCostComponent } from "./ListCost";

const { main, side } = detail.sampleList as {
  main: SampleCard[];
  side: SampleCard[];
};
const cards: Record<string, SampleCardData> = sampleCards.cards;

function card(name: string, count: number): SampleCard {
  return { name, count, setCode: null, collectorNumber: null };
}

function priced(tix: number | null): SampleCardData {
  return { imageUrl: null, tix, eur: null, usd: null };
}

function pressed(): string | null {
  return (
    screen
      .getByRole("group", { name: "Currency" })
      .querySelector('[aria-pressed="true"]')?.textContent ?? null
  );
}

let ListCost: typeof ListCostComponent;

function blockStorage(method: "getItem" | "setItem"): void {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException("Storage is disabled", "SecurityError");
  });
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  ({ ListCost } = await import("./ListCost"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ListCost", () => {
  it("adds up the list in tickets by default, split by board, with its source", () => {
    render(<ListCost main={main} side={side} cards={cards} />);

    expect(screen.getByRole("region", { name: "Cost to build" })).toBeTruthy();
    expect(pressed()).toBe("MTGO");
    expect(screen.getByText("231.73").textContent).toBe("231.73 tix");
    expect(
      screen.getByText("Main deck 76.87 tix · Sideboard 154.86 tix"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Prices from Scryfall, at each card’s cheapest printing.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("No price for 1 card.")).toBeTruthy();
  });

  it("switches to euros and dollars and keeps the choice", () => {
    render(<ListCost main={main} side={side} cards={cards} />);

    fireEvent.click(screen.getByRole("button", { name: "€" }));

    expect(pressed()).toBe("€");
    expect(screen.getByText("€185.40")).toBeTruthy();
    expect(
      screen.getByText("Main deck €100.81 · Sideboard €84.59"),
    ).toBeTruthy();
    expect(localStorage.getItem("currency")).toBe("eur");

    fireEvent.click(screen.getByRole("button", { name: "$" }));

    expect(screen.getByText("$155.32")).toBeTruthy();
    expect(
      screen.getByText("Main deck $88.56 · Sideboard $66.76"),
    ).toBeTruthy();
    expect(localStorage.getItem("currency")).toBe("usd");
  });

  it("opens on the stored currency", () => {
    localStorage.setItem("currency", "usd");

    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("$");
    expect(screen.getByText("$155.32")).toBeTruthy();
  });

  it("falls back to tickets for an unknown stored value, and leaves it alone", () => {
    localStorage.setItem("currency", "EUR");

    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("MTGO");
    expect(screen.getByText("231.73").textContent).toBe("231.73 tix");
    expect(localStorage.getItem("currency")).toBe("EUR");
  });

  it("falls back to tickets when the browser refuses to read the storage", () => {
    blockStorage("getItem");

    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("MTGO");
    expect(screen.getByText("231.73").textContent).toBe("231.73 tix");
  });

  it("still switches, and keeps the choice for the session, when the browser refuses to store it", () => {
    blockStorage("setItem");

    const { unmount } = render(
      <ListCost main={main} side={side} cards={cards} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "€" }));

    expect(pressed()).toBe("€");
    expect(screen.getByText("€185.40")).toBeTruthy();

    unmount();
    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("€");
  });

  it("keeps the choice for the session when the storage is blocked", () => {
    blockStorage("getItem");
    blockStorage("setItem");

    const { unmount } = render(
      <ListCost main={main} side={side} cards={cards} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "€" }));
    unmount();
    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("€");
    expect(screen.getByText("€185.40")).toBeTruthy();
  });

  it("lets a stored value win over the session's choice", () => {
    const { unmount } = render(
      <ListCost main={main} side={side} cards={cards} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "€" }));
    unmount();
    localStorage.setItem("currency", "usd");
    render(<ListCost main={main} side={side} cards={cards} />);

    expect(pressed()).toBe("$");
  });

  it("counts each card with no price once, whether it is missing or null, in either board", () => {
    render(
      <ListCost
        main={[card("Galvanic Blast", 4), card("Krark-Clan Shaman", 3)]}
        side={[card("Krark-Clan Shaman", 1), card("Pyroblast", 4)]}
        cards={{ "Galvanic Blast": priced(0.23), Pyroblast: priced(null) }}
      />,
    );

    expect(screen.getByText("0.92").textContent).toBe("0.92 tix");
    expect(screen.getByText("No price for 2 cards.")).toBeTruthy();
  });

  it("rounds each card to the cent, so the boards add up to the total", () => {
    render(
      <ListCost
        main={[card("Ornithopter", 1)]}
        side={[card("Hydroblast", 1)]}
        cards={{ Ornithopter: priced(0.005), Hydroblast: priced(0.005) }}
      />,
    );

    expect(screen.getByText("0.02").textContent).toBe("0.02 tix");
    expect(
      screen.getByText("Main deck 0.01 tix · Sideboard 0.01 tix"),
    ).toBeTruthy();
  });

  it("splits a list with no sideboard as the main deck alone", () => {
    render(
      <ListCost
        main={[card("Galvanic Blast", 4), card("Mountain", 1)]}
        side={[]}
        cards={{ "Galvanic Blast": priced(0.23), Mountain: priced(0) }}
      />,
    );

    expect(screen.getByText("0.92").textContent).toBe("0.92 tix");
    expect(screen.getByText("Main deck 0.92 tix")).toBeTruthy();
    expect(screen.queryByText(/No price/)).toBeNull();
  });

  it("shows no total when no card has a price in the currency", () => {
    render(
      <ListCost
        main={[card("Galvanic Blast", 4), card("Mountain", 1)]}
        side={[card("Pyroblast", 4)]}
        cards={{ Mountain: priced(0), Pyroblast: priced(null) }}
      />,
    );

    expect(screen.queryByText(/tix/)).toBeNull();
    expect(screen.queryByText(/Main deck/)).toBeNull();
    expect(
      screen.getByText(
        "Prices from Scryfall, at each card’s cheapest printing.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("No price for 2 cards.")).toBeTruthy();
  });
});
