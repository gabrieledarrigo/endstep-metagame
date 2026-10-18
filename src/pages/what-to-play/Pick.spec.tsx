import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { RankedDeck } from "../../helpers";
import { Pick, PickSkeleton } from "./Pick";

function ranked(name: string, rate: number): RankedDeck {
  const slug = `${name.toLowerCase().replaceAll(" ", "-")}-1234abcd`;

  return {
    deck: { id: slug, slug, name, colours: [], share: 0.05 },
    rate,
    low: rate - 0.01,
    high: rate + 0.01,
    verdict: "win",
  };
}

const SPY = ranked("Spy combo", 0.57495);
const BOGLES = ranked("Bogles", 0.55434);
const RALLY = ranked("Mono Red Rally", 0.54207);

function renderAt(ui: ReactElement): HTMLElement {
  const { container } = render(
    <MemoryRouter initialEntries={["/what-to-play?window=14d"]}>
      {ui}
    </MemoryRouter>,
  );

  return container;
}

function title(): HTMLElement {
  return screen.getByRole("heading", { level: 2 });
}

describe("Pick", () => {
  it("names one deck, its rate and the window's period", () => {
    renderAt(<Pick decks={[SPY]} more={0} period="the last 14 days" />);

    expect(screen.getByText("Our pick")).toBeTruthy();
    expect(title().textContent).toBe("Play Spy combo!");
    expect(
      screen.getByText(
        "Spy combo wins 57.5% of its matches against the metagame you expect.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Based on the last 14 days.")).toBeTruthy();
  });

  it("links each picked deck to its page with the current window", () => {
    renderAt(<Pick decks={[SPY, BOGLES]} more={0} period="the last 14 days" />);

    expect(
      screen.getByRole("link", { name: "Bogles" }).getAttribute("href"),
    ).toBe("/decks/bogles-1234abcd?window=14d");
  });

  it("names two decks too close to tell apart, with both rates", () => {
    renderAt(<Pick decks={[SPY, BOGLES]} more={0} period="the last 14 days" />);

    expect(title().textContent).toBe("Play Spy combo or Bogles!");
    expect(screen.getByText(/^They win/).textContent).toBe(
      "They win the most matches against the metagame you expect: 57.5% and 55.4%. The gap between them is too small to call.",
    );
  });

  it("names three decks, and says how many more are just as close", () => {
    renderAt(
      <Pick decks={[SPY, BOGLES, RALLY]} more={1} period="the last 14 days" />,
    );

    expect(title().textContent).toBe(
      "Play Spy combo, Bogles or Mono Red Rally!",
    );
    expect(screen.getByText(/^They win/).textContent).toBe(
      "They win the most matches against the metagame you expect: 57.5%, 55.4% and 54.2%. The gap between them is too small to call, and 1 more deck is just as close.",
    );
  });

  it("counts several more decks in the plural", () => {
    renderAt(
      <Pick decks={[SPY, BOGLES, RALLY]} more={2} period="the last 14 days" />,
    );

    expect(screen.getByText(/^They win/).textContent).toMatch(
      /, and 2 more decks are just as close\.$/,
    );
  });

  it("makes the title alone a polite live region", () => {
    const container = renderAt(
      <Pick decks={[SPY]} more={0} period="the last 14 days" />,
    );

    expect(title().getAttribute("aria-live")).toBe("polite");
    expect(title().getAttribute("aria-atomic")).toBe("true");
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });

  it("leaves the basis out when there is no period to name", () => {
    renderAt(<Pick decks={[SPY]} more={0} />);

    expect(screen.queryByText(/Based on/)).toBeNull();
  });
});

describe("PickSkeleton", () => {
  it("keeps the label and marks the panel busy", () => {
    const container = renderAt(<PickSkeleton />);

    expect(screen.getByText("Our pick")).toBeTruthy();
    expect(container.querySelector(".pick")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
