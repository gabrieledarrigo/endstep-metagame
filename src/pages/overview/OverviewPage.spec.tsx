import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import decks from "../../../test/fixtures/decks.json";
import search from "../../../test/fixtures/search.json";
import series from "../../../test/fixtures/share-series.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { sizeCharts } from "../../../test/sizeCharts";
import { OverviewPage } from "./OverviewPage";

type Answer = (window: string | null) => Response | Promise<Response>;

type SearchAnswer = (url: URL) => Response | Promise<Response>;

type SearchDeck = (typeof search.decks.items)[number];

function matches(
  url: URL,
  items: SearchDeck[] = search.decks.items,
  total = items.length,
): Response {
  return Response.json({
    ...search,
    provenance: {
      ...search.provenance,
      window: {
        ...search.provenance.window,
        preset: url.searchParams.get("window"),
      },
    },
    query: { ...search.query, q: url.searchParams.get("q") },
    decks: {
      ...search.decks,
      items,
      total,
      page: Number(url.searchParams.get("page")),
    },
  });
}

function numberedDecks(from: number, to: number): SearchDeck[] {
  const [model] = search.decks.items;

  return Array.from({ length: to - from + 1 }, (ignored, index) => {
    const number = from + index;

    return {
      ...model,
      id: `deck-${number}`,
      slug: `deck-${number}-0000000${number % 10}`,
      name: `Deck ${number}`,
      players: number,
      share: { ...model.share, rate: (100 - number) / 1000 },
    };
  });
}

function stubApi(
  answerDecks: Answer,
  answerSearch: SearchAnswer = (url) => matches(url),
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input), "http://localhost");

    if (url.pathname.endsWith("/decks") && url.searchParams.has("q")) {
      return answerSearch(url);
    }

    if (url.pathname.endsWith("/decks")) {
      return answerDecks(url.searchParams.get("window"));
    }

    return Response.json(series);
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function Address() {
  const { search } = useLocation();

  return (
    <p>
      Address: {search} by {useNavigationType()}
    </p>
  );
}

function renderAt(path: string): void {
  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <OverviewPage />
      <Address />
    </MemoryRouter>,
  );
}

function emptyDecks(): Response {
  return Response.json({
    ...decks,
    decks: { ...decks.decks, items: [], total: 0 },
  });
}

function pressedView(): string | null {
  return within(screen.getByRole("group", { name: "View" })).getByRole(
    "button",
    { pressed: true },
  ).textContent;
}

function deckOrder(): (string | null)[] {
  return screen.getAllByRole("rowheader").map((cell) => cell.textContent);
}

function placeholderStats(): HTMLElement[] {
  return screen
    .queryAllByRole("term")
    .filter((term) => term.textContent === "");
}

function pressedWindow(): string | null {
  return within(screen.getByRole("group", { name: "Time window" })).getByRole(
    "button",
    { pressed: true },
  ).textContent;
}

function searchRequests(fetchMock: Mock<typeof fetch>): URL[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.searchParams.has("q"));
}

function field(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>("searchbox", {
    name: "Search decks or cards",
  });
}

function type(text: string): void {
  fireEvent.change(field(), { target: { value: text } });
}

function topDeck(name: string): HTMLElement {
  return within(
    screen.getByRole("region", { name: "Decks by meta share" }),
  ).getByRole("link", { name });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function statusReads(text: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("status").textContent).toBe(text);
  });
}

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OverviewPage", () => {
  it("announces the loading window, then shows the cards and every chart", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d");

    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 30d window.",
    );

    expect(
      await screen.findByRole("region", { name: "Decks by meta share" }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("");
    });
    expect(screen.getByText("236,728")).toBeTruthy();
    expect(pressedView()).toBe("Cards");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Affinity" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Meta share by deck, chart" }),
    ).toBeTruthy();
    expect(screen.getByText("50% win rate")).toBeTruthy();
  });

  it("requests the window the reader picks", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(pressedWindow()).toBe("7d");
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = new URL(String(input), "http://localhost");

        return (
          url.pathname.endsWith("/decks") &&
          url.searchParams.get("window") === "7d"
        );
      }),
    ).toBe(true);
  });

  it("keeps every section on screen, dimmed and busy, while another window loads, and holds back the window's dates", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi((window) =>
      window === "7d"
        ? new Promise<Response>((resolve) => (answer = resolve))
        : Response.json(decks),
    );
    renderAt("/?window=30d");
    await screen.findByText("06 Sept to 05 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
    expect(
      screen
        .getByRole("region", { name: "Decks by meta share" })
        .closest("[aria-busy]"),
    ).toBeTruthy();
    expect(screen.getByText("236,728")).toBeTruthy();
    expect(screen.queryByText("06 Sept to 05 Oct 2026")).toBeNull();

    answer(Response.json(decks));

    expect(await screen.findByText("06 Sept to 05 Oct 2026")).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Decks by meta share" })
        .closest("[aria-busy]"),
    ).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("does not judge the next window empty from the previous one while it loads", async () => {
    stubApi((window) =>
      window === "30d"
        ? Response.json({
            ...decks,
            decks: { ...decks.decks, items: [], total: 0 },
          })
        : new Promise<Response>(() => {}),
    );
    renderAt("/?window=30d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to season" }),
    );

    expect(await screen.findByText("Loading the season window.")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "No decks in this window" }),
    ).toBeNull();
    expect(screen.queryByText("236,728")).toBeNull();
  });

  it("ends the busy state when one request fails, and shows its error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = new URL(String(input), "http://localhost");

        if (url.pathname.endsWith("/decks")) {
          return Response.json(decks);
        }

        return url.searchParams.get("window") === "7d"
          ? Response.json({ error: "Not found" }, { status: 404 })
          : Response.json(series);
      }),
    );
    renderAt("/?window=30d");
    await screen.findByText("06 Sept to 05 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(
      await screen.findByRole("heading", {
        name: "Share over time could not be loaded",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBeNull();
    expect(
      screen
        .getByRole("region", { name: "Decks by meta share" })
        .closest("[aria-busy]"),
    ).toBeNull();
  });

  it("offers a longer window when this one has no decks", async () => {
    stubApi((window) =>
      Response.json(
        window === "30d"
          ? { ...decks, decks: { ...decks.decks, items: [], total: 0 } }
          : decks,
      ),
    );
    renderAt("/?window=30d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to season" }),
    );

    expect(pressedWindow()).toBe("season");
    expect(
      await screen.findByRole("region", { name: "Decks by meta share" }),
    ).toBeTruthy();
  });

  it("shows an error in each section the deck list feeds, and keeps the rest", async () => {
    stubApi(() => Response.json({ error: "Not found" }, { status: 404 }));
    renderAt("/?window=30d");

    for (const title of [
      "The summary could not be loaded",
      "The deck grid could not be loaded",
      "Meta share by deck could not be loaded",
      "Win rate against share could not be loaded",
    ]) {
      expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
    }
    expect(
      await screen.findByRole("button", { name: "Affinity" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "The deck table could not be loaded",
      }),
    ).toBeNull();
  });

  it("names the deck table in its error when the table is the view", async () => {
    stubApi(() => Response.json({ error: "Not found" }, { status: 404 }));
    renderAt("/?window=30d&view=table");

    expect(
      await screen.findByRole("heading", {
        name: "The deck table could not be loaded",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "The deck grid could not be loaded",
      }),
    ).toBeNull();
  });

  it("opens on the table when the address names it, and shows no cards", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=table");

    expect(
      await screen.findByRole("region", { name: "Deck table" }),
    ).toBeTruthy();
    expect(pressedView()).toBe("Table");
    expect(
      screen.getByRole("heading", { level: 2, name: "Deck table" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Decks by meta share" }),
    ).toBeNull();
  });

  it("shows the cards when the address names an unknown view, and leaves the address alone", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=list");

    expect(
      await screen.findByRole("region", { name: "Decks by meta share" }),
    ).toBeTruthy();
    expect(pressedView()).toBe("Cards");
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText("Address: ?window=30d&view=list by POP"),
    ).toBeTruthy();
  });

  it("leaves the address alone when the view already shown is picked", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=table");
    await screen.findByRole("region", { name: "Deck table" });

    fireEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(
      screen.getByText("Address: ?window=30d&view=table by POP"),
    ).toBeTruthy();
  });

  it("removes an unknown view from the address when the cards are picked", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=list");
    await screen.findByRole("region", { name: "Decks by meta share" });

    fireEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
  });

  it("switches between the cards and the table, replacing the history entry", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    fireEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.getByText("Address: ?window=30d by POP")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(
      screen.getByText("Address: ?window=30d&view=table by REPLACE"),
    ).toBeTruthy();
    expect(pressedView()).toBe("Table");
    expect(screen.getByRole("region", { name: "Deck table" })).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Decks by meta share" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
    expect(pressedView()).toBe("Cards");
    expect(
      screen.getByRole("region", { name: "Decks by meta share" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("keeps the table's sort in the address while the cards show", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=table&sort=name&dir=desc");
    await screen.findByRole("region", { name: "Deck table" });

    fireEvent.click(screen.getByRole("button", { name: "Cards" }));

    expect(
      screen.getByText("Address: ?window=30d&sort=name&dir=desc by REPLACE"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Decks by meta share" }))
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(["Affinity", "Mono Red Madness", "Monster Tron"]);

    fireEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(deckOrder()).toEqual([
      "Monster Tron",
      "Mono Red Madness",
      "Affinity",
    ]);
  });

  it("shows only the cards' skeleton while the decks load", () => {
    stubApi(() => new Promise<Response>(() => {}));
    renderAt("/?window=30d");

    expect(placeholderStats()).toHaveLength(96);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows only the table's skeleton while the decks load, when the table is the view", () => {
    stubApi(() => new Promise<Response>(() => {}));
    renderAt("/?window=30d&view=table");

    expect(screen.getByRole("table")).toBeTruthy();
    expect(placeholderStats()).toHaveLength(0);
  });

  it("offers a longer window in the table view when this one has no decks", async () => {
    stubApi((window) =>
      window === "30d" ? emptyDecks() : Response.json(decks),
    );
    renderAt("/?window=30d&view=table");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to season" }),
    );

    expect(
      await screen.findByRole("region", { name: "Deck table" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Address: ?window=season&view=table by PUSH"),
    ).toBeTruthy();
  });

  it("switches the view while another window loads, and keeps it dimmed and busy", async () => {
    stubApi((window) =>
      window === "7d" ? new Promise<Response>(() => {}) : Response.json(decks),
    );
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    await screen.findByText("Loading the 7d window.");
    fireEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(
      screen.getByText("Address: ?window=7d&view=table by REPLACE"),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Deck table" }).closest("[aria-busy]"),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "View" }).getAttribute("data-busy"),
    ).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 7d window.",
    );
  });
});

describe("OverviewPage search", () => {
  it("lists the decks that match a term in the cards, outside the top 24, each linked to its deck page", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    type("altar");

    await statusReads("5 decks match \u201caltar\u201d.");
    expect(
      screen.getByText("Address: ?window=30d&q=altar by REPLACE"),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Altar Tron" }).getAttribute("href"),
    ).toBe("/decks/altar-tron-0b4d9ce7?window=30d");
    expect(
      within(
        screen.getByRole("region", { name: "Decks by meta share" }),
      ).queryByRole("link", { name: "Affinity" }),
    ).toBeNull();
    expect(
      screen.getByText(/Search covers deck names and every card/),
    ).toBeTruthy();

    const knight = screen.getByRole("link", {
      name: "Yore-Tiller Breathless Knight",
    });
    expect(within(knight).getByText("<0.01%")).toBeTruthy();
    expect(within(knight).getByText("Too few to call, 6 of 20")).toBeTruthy();

    const [request] = searchRequests(fetchMock);
    expect(request.search).toBe(
      "?window=30d&population=rated&q=altar&sort=share&dir=desc&page=1&pageSize=24",
    );
  });

  it("lists the same results in the table, named by the term and ranked by share among them", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&view=table&q=altar");

    const table = await screen.findByRole("table", {
      name: "Decks that match \u201caltar\u201d, sortable by column",
    });
    const row = within(table).getByRole("row", { name: /Altar Tron/ });

    expect(within(row).getByRole("cell", { name: "3" })).toBeTruthy();
    expect(
      within(row)
        .getByRole("link", { name: "Altar Tron" })
        .getAttribute("href"),
    ).toBe("/decks/altar-tron-0b4d9ce7?window=30d");
    expect(
      within(within(table).getByRole("row", { name: /Yore-Tiller/ })).getByText(
        "<0.1%",
      ),
    ).toBeTruthy();
  });

  it("restores a search from the address on load, with the term in the field", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d&q=altar");

    expect(field().value).toBe("altar");
    expect(
      await screen.findByRole("link", { name: "Altar Tron" }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sends and writes the term trimmed, with its spaces collapsed and lowercased", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d");

    type("  ALTAR   Tron ");

    expect(
      await screen.findByText("Address: ?window=30d&q=altar+tron by REPLACE"),
    ).toBeTruthy();
    expect(field().value).toBe("  ALTAR   Tron ");
    await waitFor(() => {
      expect(searchRequests(fetchMock)[0]?.searchParams.get("q")).toBe(
        "altar tron",
      );
    });
  });

  it("searches nothing for one character, and keeps the top 24", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    type("a");
    await pause(400);

    expect(searchRequests(fetchMock)).toHaveLength(0);
    expect(screen.getByText("Address: ?window=30d by POP")).toBeTruthy();
    expect(topDeck("Affinity")).toBeTruthy();
  });

  it("clears the search with the field's button, removes q and shows the top 24", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&q=altar");
    await screen.findByRole("link", { name: "Altar Tron" });

    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
    expect(field().value).toBe("");
    expect(document.activeElement).toBe(field());
    await waitFor(() => {
      expect(topDeck("Affinity")).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: "Altar Tron" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows the empty panel for no match, whose button clears the search and returns focus to the field", async () => {
    stubApi(
      () => Response.json(decks),
      (url) => matches(url, []),
    );
    renderAt("/?window=30d&q=xyzzy");

    const heading = await screen.findByRole("heading", {
      name: "No deck or card matches \u201cxyzzy\u201d",
    });
    await statusReads("No deck or card matches \u201cxyzzy\u201d.");
    expect(screen.queryByText(/decks? match/)).toBeNull();

    fireEvent.click(
      within(heading.parentElement as HTMLElement).getByRole("button", {
        name: "Clear the search",
      }),
    );

    expect(screen.getByText("Address: ?window=30d by REPLACE")).toBeTruthy();
    expect(document.activeElement).toBe(field());
    expect(field().value).toBe("");
    await waitFor(() => {
      expect(topDeck("Affinity")).toBeTruthy();
    });
  });

  it("keeps focus on Show more while results remain after the next page", async () => {
    stubApi(
      () => Response.json(decks),
      (url) => {
        const page = Number(url.searchParams.get("page"));

        return matches(
          url,
          numberedDecks(page * 24 - 23, Math.min(page * 24, 60)),
          60,
        );
      },
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("60 decks match \u201cdeck\u201d.");
    const more = screen.getByRole("button", { name: "Show 24 more" });
    more.focus();

    fireEvent.click(more);

    expect(await screen.findByRole("button", { name: "Show 12 more" })).toBe(
      more,
    );
    expect(screen.getByRole("link", { name: "Deck 48" })).toBeTruthy();
    expect(document.activeElement).toBe(more);

    fireEvent.click(more);

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("link", { name: "Deck 49" }),
      );
    });
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });

  it("loads the next page of results, and moves focus to the first new deck", async () => {
    const fetchMock = stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : matches(url, numberedDecks(25, 30), 30),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("link", { name: "Deck 25" }),
      );
    });
    expect(screen.getByRole("link", { name: "Deck 30" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
    expect(
      searchRequests(fetchMock).map((url) => url.searchParams.get("page")),
    ).toEqual(["1", "2"]);
  });

  it("says when the next page fails, announces it, and keeps Show more as the retry", async () => {
    stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : Response.json({ error: "Not found" }, { status: 404 }),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    const failure =
      "The next decks could not be loaded. The request failed with status 404.";
    await statusReads(failure);
    expect(
      screen
        .getAllByText(failure)
        .filter((line) => line.getAttribute("role") !== "status"),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Show 6 more" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deck 24" })).toBeTruthy();
  });

  it("names the rate limit when the next page is refused after its retries", async () => {
    stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : Response.json({ error: "Too many requests" }, { status: 429 }),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    const failure =
      "The next decks could not be loaded. Endstep's rate limit was reached. It resets within a minute, so a retry after that usually works.";
    await waitFor(
      () => {
        expect(screen.getByRole("status").textContent).toBe(failure);
      },
      { timeout: 4000 },
    );
    expect(screen.getAllByText(failure)).toHaveLength(2);
  });

  it("sorts the loaded results in the table, and sorts again once the next page is added", async () => {
    stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : matches(url, numberedDecks(25, 30), 30),
    );
    renderAt("/?window=30d&view=table&sort=players&dir=desc&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    expect(deckOrder()[0]).toBe("Deck 24");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    await waitFor(() => {
      expect(deckOrder()).toHaveLength(30);
    });
    expect(deckOrder()[0]).toBe("Deck 30");
    expect(
      within(screen.getByRole("row", { name: /Deck 30/ })).getAllByRole(
        "cell",
      )[0].textContent,
    ).toBe("30");
  });

  it("stops offering more results when a page comes back empty", async () => {
    const fetchMock = stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : matches(url, [], 30),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
    });
    expect(screen.getByRole("link", { name: "Deck 24" })).toBeTruthy();
    expect(searchRequests(fetchMock)).toHaveLength(2);
  });

  it("leaves focus in the field when the term changes while more results load", async () => {
    stubApi(
      () => Response.json(decks),
      (url) => {
        if (url.searchParams.get("q") === "other") {
          return matches(url, numberedDecks(1, 26), 26);
        }

        return url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : new Promise<Response>(() => {});
      },
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));
    field().focus();
    type("other");

    await statusReads("26 decks match \u201cother\u201d.");
    expect(screen.getByRole("link", { name: "Deck 25" })).toBeTruthy();
    expect(document.activeElement).toBe(field());
  });

  it("leaves focus on the window when the window changes while more results load", async () => {
    stubApi(
      () => Response.json(decks),
      (url) => {
        if (url.searchParams.get("window") === "7d") {
          return matches(url, numberedDecks(1, 26), 26);
        }

        return url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : new Promise<Response>(() => {});
      },
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));
    const week = screen.getByRole("button", { name: "7d" });
    week.focus();
    fireEvent.click(week);

    await statusReads("26 decks match \u201cdeck\u201d.");
    expect(screen.getByRole("link", { name: "Deck 25" })).toBeTruthy();
    expect(document.activeElement).toBe(week);
  });

  it("lists a deck once when the next page repeats it", async () => {
    stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("page") === "1"
          ? matches(url, numberedDecks(1, 24), 30)
          : matches(url, numberedDecks(24, 30), 30),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    expect(await screen.findByRole("link", { name: "Deck 30" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Deck 24" })).toHaveLength(1);
  });

  it("keeps the summary and the charts on the top 24", async () => {
    stubApi(() => Response.json(decks));
    renderAt("/?window=30d&q=altar");
    await screen.findByRole("link", { name: "Altar Tron" });

    expect(screen.getByText("236,728")).toBeTruthy();
    expect(screen.queryByText("313,606")).toBeNull();
    expect(screen.getByRole("button", { name: "Affinity" })).toBeTruthy();
  });

  it("searches the new window with the same term, and keeps the results dimmed and busy until it loads", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchMock = stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("window") === "7d"
          ? new Promise<Response>((resolve) => (answer = resolve))
          : matches(url),
    );
    renderAt("/?window=30d&q=altar");
    await statusReads("5 decks match \u201caltar\u201d.");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    await statusReads("Loading the 7d window.");
    expect(await screen.findByText("06 Sept to 05 Oct 2026")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 7d window.",
    );
    expect(
      screen.getByText("Address: ?window=7d&q=altar by PUSH"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
    expect(
      screen.getByRole("link", { name: "Altar Tron" }).closest("[aria-busy]"),
    ).toBeTruthy();
    expect(searchRequests(fetchMock).at(-1)?.search).toContain(
      "window=7d&population=rated&q=altar",
    );

    answer(
      matches(
        new URL("http://localhost/?window=7d&q=altar&page=1"),
        search.decks.items.slice(2),
      ),
    );

    await statusReads("3 decks match \u201caltar\u201d.");
    expect(
      screen.getByRole("link", { name: "Altar Tron" }).closest("[aria-busy]"),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Gardens" })).toBeNull();
  });

  it("keeps the previous term's results dimmed while a new term loads, and leaves the window alone", async () => {
    stubApi(
      () => Response.json(decks),
      (url) =>
        url.searchParams.get("q") === "gardens"
          ? new Promise<Response>(() => {})
          : matches(url, numberedDecks(1, 24), 30),
    );
    renderAt("/?window=30d&q=deck");
    await statusReads("30 decks match \u201cdeck\u201d.");
    expect(screen.getByRole("button", { name: "Show 6 more" })).toBeTruthy();

    type("gardens");

    await statusReads("Searching for \u201cgardens\u201d.");
    expect(
      screen.getByRole("link", { name: "Deck 1" }).closest("[aria-busy]"),
    ).toBeTruthy();
    expect(field().closest("[aria-busy]")).toBeNull();
    expect(screen.getByText("236,728").closest("[aria-busy]")).toBeNull();
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });

  it("keeps the top 24 on screen, dimmed and busy, while the first search loads", async () => {
    stubApi(
      () => Response.json(decks),
      () => new Promise<Response>(() => {}),
    );
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    type("altar");

    await statusReads("Searching for \u201caltar\u201d.");
    expect(topDeck("Affinity").closest("[aria-busy]")).toBeTruthy();
    expect(screen.queryByText(/decks? match/)).toBeNull();
  });

  it("shows an error with a retry when the search fails, and keeps the field", async () => {
    stubApi(
      () => Response.json(decks),
      () => Response.json({ error: "Not found" }, { status: 404 }),
    );
    renderAt("/?window=30d&q=altar");

    expect(
      await screen.findByRole("heading", {
        name: "The search could not be loaded",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(field().value).toBe("altar");
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
