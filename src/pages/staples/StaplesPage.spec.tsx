import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import staples from "../../../test/fixtures/staples.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import type { StaplesResponse } from "../../api/types";
import { StaplesPage } from "./StaplesPage";

const MAIN = staples as StaplesResponse;
const SIDE: StaplesResponse = {
  ...MAIN,
  section: "side",
  withheld: 0,
  cards: MAIN.cards.map((card) => ({ ...card, name: `${card.name} (side)` })),
};
const WEEK: StaplesResponse = {
  ...MAIN,
  window: { from: "2026-10-14", to: "2026-10-21" },
};

function fifty(body: StaplesResponse): StaplesResponse {
  const cards = Array.from({ length: 50 }, (_, index) => ({
    ...body.cards[index % body.cards.length],
    name: `Card ${index + 1}`,
    share: 0.2 - index / 1000,
  }));

  return { ...body, cards };
}

type Answer = () => Response | Promise<Response>;

function stubApi(answers: Record<string, Answer[]>): Mock<typeof fetch> {
  const calls: Record<string, number> = {};
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const queue = answers[url] ?? [json(MAIN)];
    const index = calls[url] ?? 0;
    calls[url] = index + 1;

    return queue[Math.min(index, queue.length - 1)]();
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function json(body: unknown, status = 200): Answer {
  return (): Response => Response.json(body, { status });
}

function never(): Promise<Response> {
  return new Promise<Response>(() => {});
}

function Address() {
  const { search } = useLocation();
  const navigationType = useNavigationType();

  return (
    <p>
      Address: {search}, {navigationType}
    </p>
  );
}

function renderAt(path: string): void {
  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <StaplesPage />
      <Address />
    </MemoryRouter>,
  );
}

function status(): string {
  return screen.getByRole("status").textContent ?? "";
}

function expanded(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-expanded");
}

function pressed(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StaplesPage", () => {
  it("names the page, says what it shows, and loads the main deck of the window", async () => {
    const fetchMock = stubApi({});
    renderAt("/staples?window=30d");

    expect(
      screen.getByRole("heading", { level: 1, name: "Staples" }),
    ).toBeTruthy();
    expect(document.title).toBe("Staples · Pauper Endstep metagame");
    expect(
      screen.getByText("The cards the top 24 decks play most."),
    ).toBeTruthy();
    expect(status()).toBe("Loading the main deck for the 30d window.");

    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
    expect(status()).toBe("");
    expect(screen.getByText("21 Sept to 20 Oct 2026")).toBeTruthy();
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/staples?window=30d&section=main",
    ]);
  });

  it("opens the sideboard from a copied address", async () => {
    const fetchMock = stubApi({
      "/api/staples?window=30d&section=side": [json(SIDE)],
    });
    renderAt("/staples?window=30d&section=side");

    expect(status()).toBe("Loading the sideboard for the 30d window.");
    expect(await screen.findByText("Lightning Bolt (side)")).toBeTruthy();
    expect(pressed("Sideboard")).toBe("true");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/staples?window=30d&section=side",
    );
  });

  it("reads an unknown section as the main deck and leaves the address alone", async () => {
    const fetchMock = stubApi({});
    renderAt("/staples?window=30d&section=both");

    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
    expect(pressed("Main deck")).toBe("true");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/staples?window=30d&section=main",
    );
    expect(
      screen.getByText("Address: ?window=30d&section=both, POP"),
    ).toBeTruthy();
  });

  it("writes the sideboard to the address and removes it for the main deck, replacing the history entry", async () => {
    stubApi({
      "/api/staples?window=30d&section=side": [json(SIDE)],
    });
    renderAt("/staples?window=30d");
    await screen.findByText("Lightning Bolt");

    fireEvent.click(screen.getByRole("button", { name: "Sideboard" }));

    expect(
      screen.getByText("Address: ?window=30d&section=side, REPLACE"),
    ).toBeTruthy();
    expect(await screen.findByText("Lightning Bolt (side)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Main deck" }));

    expect(screen.getByText("Address: ?window=30d, REPLACE")).toBeTruthy();
    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
  });

  it("writes nothing when the reader presses the list on screen", async () => {
    stubApi({});
    renderAt("/staples?window=30d");
    await screen.findByText("Lightning Bolt");

    fireEvent.click(screen.getByRole("button", { name: "Main deck" }));

    expect(screen.getByText("Address: ?window=30d, POP")).toBeTruthy();
  });

  it("shows the skeleton, not the main deck, while the sideboard loads, and keeps focus on the switch", async () => {
    stubApi({ "/api/staples?window=30d&section=side": [never] });
    renderAt("/staples?window=30d");
    await screen.findByText("Lightning Bolt");

    const sideboard = screen.getByRole("button", { name: "Sideboard" });
    sideboard.focus();
    fireEvent.click(sideboard);

    expect(screen.queryByText("Lightning Bolt")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(status()).toBe("Loading the sideboard for the 30d window.");
    expect(screen.queryByText("21 Sept to 20 Oct 2026")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sideboard" }),
    );
  });

  it("marks the switch busy while the other list loads, and idle once it arrives", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({
      "/api/staples?window=30d&section=side": [
        (): Promise<Response> =>
          new Promise<Response>((resolve) => (answer = resolve)),
      ],
    });
    renderAt("/staples?window=30d");
    await screen.findByText("Lightning Bolt");
    const parts = (): string | null =>
      screen
        .getByRole("group", { name: "Part of the deck" })
        .getAttribute("data-busy");
    expect(parts()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sideboard" }));
    expect(parts()).toBe("true");

    answer(Response.json(SIDE));

    expect(await screen.findByText("Lightning Bolt (side)")).toBeTruthy();
    expect(parts()).toBeNull();
  });

  it("keeps the list on screen, dimmed and busy, while another window loads, and holds back its dates", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({
      "/api/staples?window=7d&section=main": [
        (): Promise<Response> =>
          new Promise<Response>((resolve) => (answer = resolve)),
      ],
    });
    renderAt("/staples?window=30d");
    await screen.findByText("21 Sept to 20 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(status()).toBe("Loading the main deck for the 7d window.");
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
    expect(
      screen
        .getByRole("group", { name: "Part of the deck" })
        .getAttribute("data-busy"),
    ).toBe("true");
    expect(
      screen.getByText("Lightning Bolt").closest('[aria-busy="true"]'),
    ).toBeTruthy();
    expect(screen.queryByText("21 Sept to 20 Oct 2026")).toBeNull();

    answer(Response.json(WEEK));

    expect(await screen.findByText("14 Oct to 20 Oct 2026")).toBeTruthy();
    expect(
      screen.getByText("Lightning Bolt").closest("[aria-busy]"),
    ).toBeNull();
    expect(status()).toBe("");
  });

  it("shows 30 cards for the next window when the reader shows more on the dimmed list while it loads", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({
      "/api/staples?window=30d&section=main": [json(fifty(MAIN))],
      "/api/staples?window=7d&section=main": [
        (): Promise<Response> =>
          new Promise<Response>((resolve) => (answer = resolve)),
      ],
    });
    renderAt("/staples?window=30d");
    await screen.findByText("Card 1");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    expect(screen.getByText("Card 50")).toBeTruthy();

    answer(Response.json(fifty(WEEK)));

    expect(await screen.findByText("14 Oct to 20 Oct 2026")).toBeTruthy();
    expect(screen.getByText("Card 30")).toBeTruthy();
    expect(screen.queryByText("Card 31")).toBeNull();
    expect(screen.getByRole("button", { name: "Show 20 more" })).toBeTruthy();
  });

  it("closes the open cards when the reader picks another window, and keeps a card opened during the load open", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({
      "/api/staples?window=7d&section=main": [
        (): Promise<Response> =>
          new Promise<Response>((resolve) => (answer = resolve)),
      ],
    });
    renderAt("/staples?window=30d");
    fireEvent.click(
      await screen.findByRole("button", { name: "Lightning Bolt" }),
    );
    expect(expanded("Lightning Bolt")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(expanded("Lightning Bolt")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Counterspell" }));

    answer(Response.json(WEEK));

    expect(await screen.findByText("14 Oct to 20 Oct 2026")).toBeTruthy();
    expect(expanded("Counterspell")).toBe("true");
    expect(expanded("Lightning Bolt")).toBe("false");
  });

  it("closes the open cards after a switch to the other list and back", async () => {
    stubApi({
      "/api/staples?window=30d&section=side": [json(SIDE)],
    });
    renderAt("/staples?window=30d");
    fireEvent.click(
      await screen.findByRole("button", { name: "Lightning Bolt" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Sideboard" }));
    await screen.findByText("Lightning Bolt (side)");
    fireEvent.click(screen.getByRole("button", { name: "Main deck" }));

    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
    expect(expanded("Lightning Bolt")).toBe("false");
  });

  it("keeps the sideboard in the address when the window changes", async () => {
    stubApi({
      "/api/staples?window=30d&section=side": [json(SIDE)],
      "/api/staples?window=7d&section=side": [json(SIDE)],
    });
    renderAt("/staples?window=30d&section=side");
    await screen.findByText("Lightning Bolt (side)");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(
      await screen.findByText("Address: ?window=7d&section=side, PUSH"),
    ).toBeTruthy();
  });

  it("does not judge the next window empty from the previous one while it loads", async () => {
    stubApi({
      "/api/staples?window=1d&section=main": [
        json({ ...MAIN, withheld: 0, cards: [] }),
      ],
      "/api/staples?window=7d&section=main": [never],
    });
    renderAt("/staples?window=1d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to 7d" }),
    );

    expect(
      await screen.findByText("Loading the main deck for the 7d window."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "No decks in this window" }),
    ).toBeNull();
  });

  it("does not retry a failed build on its own, and retries when asked", async () => {
    const fetchMock = stubApi({
      "/api/staples?window=30d&section=main": [
        json({ error: "x" }, 502),
        json(MAIN),
      ],
    });
    renderAt("/staples?window=30d");

    const panel = screen.getByRole("region", { name: "Most played cards" });
    expect(
      await within(panel).findByRole("heading", {
        name: "The staples could not be loaded",
      }),
    ).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(within(panel).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a rate limit as such", async () => {
    stubApi({
      "/api/staples?window=30d&section=main": [json({ error: "x" }, 429)],
    });
    renderAt("/staples?window=30d");

    expect(await screen.findByText(/rate limit was reached/)).toBeTruthy();
  });

  it("shows 30 cards again after a switch to the other list and back", async () => {
    const many: StaplesResponse = {
      ...MAIN,
      cards: Array.from({ length: 50 }, (_, index) => ({
        ...MAIN.cards[0],
        name: `Card ${index + 1}`,
        share: 0.2 - index / 1000,
      })),
    };
    stubApi({
      "/api/staples?window=30d&section=main": [json(many)],
      "/api/staples?window=30d&section=side": [json(SIDE)],
    });
    renderAt("/staples?window=30d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Show 20 more" }),
    );
    expect(screen.getByText("Card 50")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sideboard" }));
    await screen.findByText("Lightning Bolt (side)");
    fireEvent.click(screen.getByRole("button", { name: "Main deck" }));

    await waitFor(() => {
      expect(screen.getByText("Card 30")).toBeTruthy();
    });
    expect(screen.queryByText("Card 31")).toBeNull();
  });
});
