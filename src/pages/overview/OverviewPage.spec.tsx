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
import series from "../../../test/fixtures/share-series.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { sizeCharts } from "../../../test/sizeCharts";
import { OverviewPage } from "./OverviewPage";

type Answer = (window: string | null) => Response | Promise<Response>;

function stubApi(answerDecks: Answer): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input), "http://localhost");

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
