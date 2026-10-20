import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
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
  onSection = (): void => {},
  onWindow = (): void => {},
}: {
  timeWindow?: TimeWindow;
  section?: StaplesSection;
  onSection?: (next: StaplesSection) => void;
  onWindow?: (next: TimeWindow) => void;
}) {
  const query = useQuery({
    queryKey: ["staples", timeWindow, section],
    queryFn: ({ signal }) => fetchStaples(timeWindow, section, signal),
    retry: false,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === section && previous?.cards.length
        ? previous
        : undefined,
  });

  return (
    <MemoryRouter>
      <Staples
        query={query}
        timeWindow={timeWindow}
        section={section}
        onSection={onSection}
        onWindow={onWindow}
      />
    </MemoryRouter>
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
  const list = screen.getAllByRole("list")[0];

  return within(list)
    .getAllByRole("listitem")
    .filter((item) => item.parentElement === list);
}

function expanded(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-expanded");
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

  it("shows the first 30 cards in order, then 20 more, and moves focus to the name of the first new card", async () => {
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
    expect(document.activeElement).toBe(
      within(lines()[30]).getByRole("button", { name: "Card 31" }),
    );
    expect(lines()[30].textContent).toMatch(/^31Card 31/);
  });

  it("opens several cards at once", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Lightning Bolt" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Counterspell" }));

    expect(expanded("Lightning Bolt")).toBe("true");
    expect(expanded("Counterspell")).toBe("true");
    expect(expanded("Bojuka Bog")).toBe("false");
  });

  it("keeps the open cards open when the reader shows more", async () => {
    stubApi(withCards(50));
    renderWithQueries(<Harness />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Lightning Bolt" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));

    expect(expanded("Lightning Bolt")).toBe("true");
    expect(expanded("Card 31")).toBe("false");
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
    let calls = 0;
    stubApi(() => {
      calls += 1;

      return Response.json(
        calls === 1
          ? withCards(50)
          : {
              ...withCards(50),
              window: { from: "2026-10-14", to: "2026-10-21" },
            },
      );
    });
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

  it("marks the switch busy while a list loads", () => {
    stubApi(() => new Promise<Response>(() => {}));
    renderWithQueries(<Harness />);

    expect(
      screen
        .getByRole("group", { name: "Part of the deck" })
        .getAttribute("data-busy"),
    ).toBe("true");
  });

  it("leaves the switch idle once the list is on screen", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness />);

    await screen.findByText("Lightning Bolt");
    expect(
      screen
        .getByRole("group", { name: "Part of the deck" })
        .getAttribute("data-busy"),
    ).toBeNull();
  });

  it("dims the list and marks it and the switch busy while another window loads", async () => {
    let calls = 0;
    stubApi(() => {
      calls += 1;

      return calls === 1
        ? Response.json(withCards(6))
        : new Promise<Response>(() => {});
    });
    const rerender = renderSwitchable(<Harness />);
    await screen.findByText("Lightning Bolt");

    rerender(<Harness timeWindow="7d" />);

    const list = screen.getAllByRole("list")[0];
    expect(screen.getByText("Lightning Bolt")).toBeTruthy();
    expect(list.closest('[aria-busy="true"]')?.className).toBe(
      "staples__body busy",
    );
    const parts = screen.getByRole("group", { name: "Part of the deck" });
    expect(parts.getAttribute("data-busy")).toBe("true");
    expect(parts.closest("[aria-busy]")).toBeNull();
  });

  it("hides Show more while the list is dimmed, and shows it again with the next window's cards", async () => {
    let calls = 0;
    let answer: (response: Response) => void = () => {};
    stubApi(() => {
      calls += 1;

      return calls === 1
        ? Response.json(withCards(50))
        : new Promise<Response>((resolve) => (answer = resolve));
    });
    const rerender = renderSwitchable(<Harness />);
    expect(
      await screen.findByRole("button", { name: "Show 20 more" }),
    ).toBeTruthy();

    rerender(<Harness timeWindow="7d" />);

    expect(lines()).toHaveLength(30);
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();

    answer(
      Response.json({
        ...withCards(50),
        window: { from: "2026-10-14", to: "2026-10-21" },
      }),
    );

    expect(
      await screen.findByRole("button", { name: "Show 20 more" }),
    ).toBeTruthy();
    expect(lines()).toHaveLength(30);
  });

  it("neither dims the list nor marks it busy once it is on screen", async () => {
    stubApi(withCards(6));
    renderWithQueries(<Harness />);

    await screen.findByText("Lightning Bolt");
    expect(screen.getAllByRole("list")[0].closest("[aria-busy]")).toBeNull();
  });
});
