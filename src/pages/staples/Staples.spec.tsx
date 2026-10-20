import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import staples from "../../../test/fixtures/staples.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { fetchStaples } from "../../api/endpoints";
import { createQueryClient } from "../../api/queryClient";
import type {
  StapleCard,
  StaplesResponse,
  StaplesSection,
  TimeWindow,
} from "../../api/types";
import { Staples } from "./Staples";

const RESPONSE = staples as StaplesResponse;

function withCards(count: number, withheld = 0): StaplesResponse {
  const cards: StapleCard[] = Array.from({ length: count }, (_, index) => {
    const card = RESPONSE.cards[index % RESPONSE.cards.length];

    return index < RESPONSE.cards.length
      ? card
      : { ...card, name: `Card ${index + 1}`, share: 0.1 - index / 1000 };
  });

  return { ...RESPONSE, withheld, cards };
}

function Harness({
  timeWindow = "30d",
  section = "main",
  busy = false,
  onSection = (): void => {},
  onWindow = (): void => {},
}: {
  timeWindow?: TimeWindow;
  section?: StaplesSection;
  busy?: boolean;
  onSection?: (next: StaplesSection) => void;
  onWindow?: (next: TimeWindow) => void;
}) {
  const query = useQuery({
    queryKey: ["staples", timeWindow, section],
    queryFn: ({ signal }) => fetchStaples(timeWindow, section, signal),
    retry: false,
  });

  return (
    <Staples
      query={query}
      timeWindow={timeWindow}
      section={section}
      onSection={onSection}
      onWindow={onWindow}
      busy={busy}
    />
  );
}

function stubApi(
  body: StaplesResponse | (() => Response | Promise<Response>),
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    typeof body === "function" ? body() : Response.json(body),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderSwitchable(ui: ReactElement): (next: ReactElement) => void {
  const client = createQueryClient();
  const { rerender } = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );

  return (next) => {
    rerender(<QueryClientProvider client={client}>{next}</QueryClientProvider>);
  };
}

function lines(): HTMLElement[] {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Staples", () => {
  it("names the panel, offers the main deck and the sideboard, and explains the percentage", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness />);

    expect(
      screen.getByRole("region", { name: "Most played cards" }),
    ).toBeTruthy();
    const parts = screen.getByRole("group", { name: "Part of the deck" });
    expect(
      within(parts)
        .getByRole("button", { name: "Main deck" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(parts)
        .getByRole("button", { name: "Sideboard" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.getByText(
        "The percentage is the share of the top 24's decks that play the card.",
      ),
    ).toBeTruthy();
    expect(await screen.findByText("Lightning Bolt")).toBeTruthy();
  });

  it("presses Sideboard for the sideboard", () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness section="side" />);

    expect(
      screen
        .getByRole("button", { name: "Sideboard" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("reports the reader's choice of list as a section", () => {
    stubApi(withCards(6));
    const onSection = vi.fn<(next: StaplesSection) => void>();
    renderWithQueries(<Harness onSection={onSection} />);

    fireEvent.click(screen.getByRole("button", { name: "Sideboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Main deck" }));

    expect(onSection.mock.calls).toEqual([["side"], ["main"]]);
  });

  it("shows a skeleton under the head until the list arrives", () => {
    stubApi(() => new Promise<Response>(() => {}));
    const { container } = renderWithQueries(<Harness />);

    expect(container.querySelector(".staples__skeleton")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sideboard" })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the first 30 cards in order, then 20 more, and moves focus to the first new card", async () => {
    stubApi(withCards(50));
    renderWithQueries(<Harness />);

    await screen.findByText("Lightning Bolt");
    expect(lines()).toHaveLength(30);
    expect(lines()[0].textContent).toMatch(/^1Lightning Bolt/);
    expect(lines()[29].textContent).toMatch(/^30Card 30/);

    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));

    expect(lines()).toHaveLength(50);
    expect(lines()[49].textContent).toMatch(/^50Card 50/);
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
    expect(document.activeElement).toBe(lines()[30]);
    expect(lines()[30].textContent).toMatch(/^31Card 31/);
  });

  it("offers only the cards that remain when fewer than 20 do", async () => {
    stubApi(withCards(42));
    renderWithQueries(<Harness />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Show 12 more" }),
    );

    expect(lines()).toHaveLength(42);
  });

  it("offers no more when the list holds 30 cards or fewer", async () => {
    stubApi(withCards(30));
    renderWithQueries(<Harness />);

    await screen.findByText("Lightning Bolt");
    expect(lines()).toHaveLength(30);
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });

  it("shows 30 again for another window", async () => {
    stubApi(withCards(50));
    const rerender = renderSwitchable(<Harness />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Show 20 more" }),
    );
    expect(lines()).toHaveLength(50);

    rerender(<Harness timeWindow="7d" />);

    await waitFor(() => {
      expect(lines()).toHaveLength(30);
    });
  });

  it("shows 30 again for the other list", async () => {
    stubApi(withCards(50));
    const rerender = renderSwitchable(<Harness />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Show 20 more" }),
    );

    rerender(<Harness section="side" />);

    await waitFor(() => {
      expect(lines()).toHaveLength(30);
    });
  });

  it("says one deck is left out when Endstep withholds one deck's cards", async () => {
    stubApi(withCards(6, 1));
    renderWithQueries(<Harness />);

    expect(
      await screen.findByText(
        "1 deck is left out because Endstep withholds its cards.",
      ),
    ).toBeTruthy();
  });

  it("counts the decks left out when Endstep withholds several", async () => {
    stubApi(withCards(6, 3));
    renderWithQueries(<Harness />);

    expect(
      await screen.findByText(
        "3 decks are left out because Endstep withholds their cards.",
      ),
    ).toBeTruthy();
  });

  it("says nothing about withheld decks when there are none", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness />);

    await screen.findByText("Lightning Bolt");
    expect(screen.queryByText(/left out/)).toBeNull();
  });

  it("shows the empty window when the window has no decks", async () => {
    stubApi(withCards(0));
    const onWindow = vi.fn<(next: TimeWindow) => void>();
    renderWithQueries(<Harness timeWindow="1d" onWindow={onWindow} />);

    expect(
      await screen.findByRole("heading", { name: "No decks in this window" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch to 7d" }));
    expect(onWindow).toHaveBeenCalledWith("7d");
  });

  it("says no cards when Endstep withholds every deck's cards", async () => {
    stubApi(withCards(0, 2));
    renderWithQueries(<Harness timeWindow="1d" />);

    expect(
      await screen.findByRole("heading", { name: "No cards in this window" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "2 decks are left out because Endstep withholds their cards. Try a longer window.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /No decks/ })).toBeNull();
  });

  it("shows the error with a retry inside the panel, under the switch", async () => {
    stubApi(() => Response.json({ error: "x" }, { status: 502 }));
    renderWithQueries(<Harness />);

    const panel = screen.getByRole("region", { name: "Most played cards" });
    expect(
      await within(panel).findByRole("heading", {
        name: "The staples could not be loaded",
      }),
    ).toBeTruthy();
    expect(within(panel).getByText("Endstep did not respond.")).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(
      within(panel).getByRole("button", { name: "Sideboard" }),
    ).toBeTruthy();
  });

  it("dims and marks busy the list, not the switch, while another window loads", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness busy />);

    const list = await screen.findByRole("list");
    expect(list.closest('[aria-busy="true"]')?.className).toBe(
      "staples__body busy",
    );
    expect(
      screen
        .getByRole("group", { name: "Part of the deck" })
        .closest("[aria-busy]"),
    ).toBeNull();
  });
});
