import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router";
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import detail from "../../../test/fixtures/deck.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { sizeCharts } from "../../../test/sizeCharts";
import { DeckPage } from "./DeckPage";

function Address() {
  const { pathname, search } = useLocation();

  return (
    <p>
      Address: {pathname + search} by {useNavigationType()}
    </p>
  );
}

function renderAt(path: string, answer: () => Response): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async () => answer());
  vi.stubGlobal("fetch", fetchMock);

  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/decks/:slug" element={<DeckPage />} />
      </Routes>
      <Address />
    </MemoryRouter>,
  );

  return fetchMock;
}

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DeckPage", () => {
  it("loads the deck for its window and shows every section", async () => {
    const fetchMock = renderAt("/decks/affinity-e93f5f74?window=30d", () =>
      Response.json(detail),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Loading the deck" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Affinity" }),
    ).toBeTruthy();
    for (const name of [
      "Share over time",
      "Games",
      "Toss",
      "Texture",
      "Sample list",
    ]) {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/decks/affinity-e93f5f74?window=30d&population=rated",
    );
  });

  it("requests the window the reader picks", async () => {
    const fetchMock = renderAt("/decks/affinity-e93f5f74?window=30d", () =>
      Response.json(detail),
    );
    await screen.findByRole("heading", { level: 1, name: "Affinity" });

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
        "/decks/affinity-e93f5f74?window=7d&",
      );
    });
  });

  it("keeps the deck and the focused selector on screen while another window loads, and says so", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchMock = vi.fn<typeof fetch>(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueries(
      <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=30d"]}>
        <Routes>
          <Route path="/decks/:slug" element={<DeckPage />} />
        </Routes>
      </MemoryRouter>,
    );
    answer(Response.json(detail));
    await screen.findByRole("heading", { level: 1, name: "Affinity" });

    const sevenDays = screen.getByRole("button", { name: "7d" });
    act(() => {
      sevenDays.focus();
    });
    fireEvent.click(sevenDays);

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Affinity" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "7d" }),
    );
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");

    answer(Response.json(detail));
    await waitFor(() => {
      expect(screen.queryByText("Loading the 7d window.")).toBeNull();
    });
  });

  it("replaces the history entry for a window picked while another loads, and hides the old dates", async () => {
    let answer: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        () => new Promise<Response>((resolve) => (answer = resolve)),
      ),
    );
    renderWithQueries(
      <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=30d"]}>
        <Routes>
          <Route path="/decks/:slug" element={<DeckPage />} />
        </Routes>
        <Address />
      </MemoryRouter>,
    );
    answer(Response.json(detail));
    await screen.findByText("11 Sep to 10 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    expect(
      await screen.findByText(
        "Address: /decks/affinity-e93f5f74?window=7d by PUSH",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("11 Sep to 10 Oct 2026")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "14d" }));
    expect(
      await screen.findByText(
        "Address: /decks/affinity-e93f5f74?window=14d by REPLACE",
      ),
    ).toBeTruthy();
  });

  it("keeps focus on the main heading when the deck finishes loading", async () => {
    let answer: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        () => new Promise<Response>((resolve) => (answer = resolve)),
      ),
    );
    renderWithQueries(
      <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=30d"]}>
        <Routes>
          <Route path="/decks/:slug" element={<DeckPage />} />
        </Routes>
      </MemoryRouter>,
    );
    act(() => {
      screen
        .getByRole("heading", { level: 1, name: "Loading the deck" })
        .focus();
    });

    answer(Response.json(detail));

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Affinity",
    });
    expect(document.activeElement).toBe(heading);
  });

  it("replaces a stale slug in the address with the deck's own", async () => {
    renderAt("/decks/renamed-e93f5f74?window=30d", () => Response.json(detail));

    expect(
      await screen.findByText(
        "Address: /decks/affinity-e93f5f74?window=30d by REPLACE",
      ),
    ).toBeTruthy();
  });

  it.each([404, 400])(
    "shows the not-found state, with no retry, for a %i",
    async (status) => {
      renderAt("/decks/mono-green-stompy-0000aaaa?window=30d", () =>
        Response.json({ error: "Unknown deck" }, { status }),
      );

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "No deck at this address",
        }),
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    },
  );

  it("offers a retry for any other failure", async () => {
    renderAt("/decks/affinity-e93f5f74?window=30d", () =>
      Response.json({ error: "Forbidden" }, { status: 403 }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "The deck could not be loaded",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Deck" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("offers a longer window when the deck has no matches in this one", async () => {
    const empty = {
      ...detail,
      deck: {
        ...detail.deck,
        matchWinRate: { ...detail.deck.matchWinRate, wins: 0, losses: 0 },
      },
    };
    renderAt("/decks/affinity-e93f5f74?window=1d", () => Response.json(empty));

    expect(
      await screen.findByRole("heading", { name: "No matches in this window" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Affinity has no matches in the 1d window. Try a longer window.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Switch to 7d" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Games" })).toBeNull();
  });
});
