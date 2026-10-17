import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import matrix from "../../../test/fixtures/matchups.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { stubWidth } from "../../../test/stubWidth";
import { createQueryClient } from "../../api/queryClient";
import { Layout } from "../../Layout";
import { MatchupsPage } from "./MatchupsPage";

const STOMPY = {
  ...detail,
  deck: { ...detail.deck, slug: "stompy-12345678", name: "Mono Green Stompy" },
};

function stubApi(
  ...responses: (() => Response | Promise<Response>)[]
): Mock<typeof fetch> {
  let calls = 0;
  const fetchMock = vi.fn<typeof fetch>(async () => {
    const answer = responses[Math.min(calls, responses.length - 1)];
    calls += 1;

    return answer();
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubRoutes(
  detailResponse: () => Response | Promise<Response> = () =>
    Response.json(STOMPY),
  ...matrices: (() => Response | Promise<Response>)[]
): Mock<typeof fetch> {
  let calls = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    if (String(input).startsWith("/api/metagame/")) {
      return detailResponse();
    }

    const answer = matrices[Math.min(calls, matrices.length - 1)];
    calls += 1;

    return answer ? answer() : Response.json(matrix);
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
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

function Back() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate(-1)}>
      Back
    </button>
  );
}

function renderAt(path: string | string[]): void {
  const entries = Array.isArray(path) ? path : [path];

  renderWithQueries(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <MatchupsPage />
      <Address />
    </MemoryRouter>,
  );
}

function stubScroll(): Mock<(options?: ScrollIntoViewOptions) => void> {
  const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = scrollIntoView;

  return scrollIntoView;
}

function notices(): string[] {
  return screen
    .queryAllByText(/isn't in the top/)
    .map(
      (element) =>
        `${element.getAttribute("role") ?? "line"}: ${element.textContent}`,
    );
}

async function waitForNotice(text: string): Promise<void> {
  await waitFor(() => {
    expect(notices()).toEqual([`status: ${text}`, `line: ${text}`]);
  });
}

function recordStatus(): string[] {
  const status = screen.getByRole("status");
  const seen = [status.textContent ?? ""];

  new MutationObserver(() => {
    const text = status.textContent ?? "";

    if (seen.at(-1) !== text) {
      seen.push(text);
    }
  }).observe(status, { childList: true, characterData: true, subtree: true });

  return seen;
}

function picker(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>("combobox", { name: "Deck" });
}

function chosen(): string | undefined {
  return Array.from(picker().options).find((option) => option.selected)
    ?.textContent;
}

function spotlit(): string[] {
  return Array.from(
    screen.getByRole("grid").querySelectorAll(".matchup__row--spotlit"),
  ).map((element) => element.textContent ?? "");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

describe("MatchupsPage", () => {
  it("announces the loading window, then shows the table and the window's dates", async () => {
    const fetchMock = stubApi(() => Response.json(matrix));
    renderAt("/matchups?window=30d");

    expect(
      screen.getByRole("heading", { level: 1, name: "Matchups" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 30d window.",
    );

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByText("11 Sept to 10 Oct 2026")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/matchups?window=30d");
  });

  it("requests the window the reader picks", async () => {
    const fetchMock = stubApi(() => Response.json(matrix));
    renderAt("/matchups?window=30d");
    await screen.findByRole("grid");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(
        "/api/matchups?window=7d",
      );
    });
  });

  it("keeps the table on screen, dimmed and busy, while another window loads, and holds back the window's name and dates", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi(
      () => Response.json(matrix),
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderAt("/matchups?window=30d");
    await screen.findByText("11 Sept to 10 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
    const grid = screen.getByRole("grid", {
      name: "Match win rate of the row deck against the column deck. Top 4 decks by share, rated.",
    });
    expect(grid.closest("[aria-busy]")).toBeTruthy();
    expect(screen.queryByText("11 Sept to 10 Oct 2026")).toBeNull();

    answer(Response.json(matrix));

    expect(await screen.findByText("11 Sept to 10 Oct 2026")).toBeTruthy();
    expect(
      screen
        .getByRole("grid", {
          name: "Match win rate of the row deck against the column deck. Top 4 decks by share, 7d window, rated.",
        })
        .closest("[aria-busy]"),
    ).toBeNull();
  });

  it("does not judge the next window empty from the previous one while it loads", async () => {
    stubApi(
      () => Response.json({ ...matrix, decks: [], cells: {} }),
      () => new Promise<Response>(() => {}),
    );
    renderAt("/matchups?window=1d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to 7d" }),
    );

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "No decks in this window" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("list", { name: "Legend" })
        .closest('[aria-busy="true"]'),
    ).toBeTruthy();
  });

  it("does not retry a failed build on its own, and retries when asked", async () => {
    const fetchMock = stubApi(
      () => Response.json({ error: "x" }, { status: 502 }),
      () => Response.json(matrix),
    );
    renderAt("/matchups?window=30d");

    expect(
      await screen.findByRole("heading", {
        name: "The matchup table could not be loaded",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Endstep did not respond.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a rate limit as a rate limit", async () => {
    stubApi(() => Response.json({ error: "x" }, { status: 429 }));
    renderAt("/matchups?window=30d");

    expect(
      await screen.findByText(/^Endstep's rate limit was reached\./),
    ).toBeTruthy();
  });

  it("offers a longer window when this one has no decks", async () => {
    const fetchMock = stubApi(
      () => Response.json({ ...matrix, decks: [], cells: {} }),
      () => Response.json(matrix),
    );
    renderAt("/matchups?window=1d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to 7d" }),
    );

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(String(fetchMock.mock.calls[1][0])).toBe("/api/matchups?window=7d");
  });

  it("opens with the deck in the address in the spotlight, and reveals its row from 1,100px", async () => {
    stubRoutes();
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d&deck=monster-tron-1bc68613");

    await screen.findByRole("grid");

    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(chosen()).toBe("Monster Tron");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("rowheader", { name: "Monster Tron" }),
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("reveals the deck's column below 1,100px", async () => {
    stubRoutes();
    stubWidth(800);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d&deck=monster-tron-1bc68613");

    await screen.findByRole("grid");

    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("columnheader", { name: "Monster Tron" }),
    );
  });

  it("finds a deck under an old name by its suffix, and leaves the address as it is", async () => {
    const fetchMock = stubRoutes();
    stubWidth(1280);
    stubScroll();
    renderAt("/matchups?window=30d&deck=renamed-1bc68613");

    await screen.findByRole("grid");

    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(chosen()).toBe("Monster Tron");
    expect(
      screen.getByText("Address: ?window=30d&deck=renamed-1bc68613, REPLACE"),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not reveal the deck again on a return to the first history entry, which keeps the browser's scroll position", async () => {
    stubRoutes();
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderWithQueries(
      <MemoryRouter
        initialEntries={["/matchups?window=30d&deck=monster-tron-1bc68613"]}
      >
        <Routes>
          <Route
            path="matchups"
            element={
              <>
                <MatchupsPage />
                <Address />
              </>
            }
          />
          <Route path="decks/:slug" element={<Back />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("grid");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        "Address: ?window=30d&deck=monster-tron-1bc68613, REPLACE",
      ),
    ).toBeTruthy();

    fireEvent.click(
      within(screen.getByRole("rowheader", { name: "Affinity" })).getByRole(
        "link",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByText("Address: ?window=30d&deck=monster-tron-1bc68613, POP"),
    ).toBeTruthy();
    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("leaves a first history entry with no deck as it is", async () => {
    stubRoutes();
    renderAt("/matchups?window=30d");

    await screen.findByRole("grid");

    expect(screen.getByText("Address: ?window=30d, POP")).toBeTruthy();
  });

  it("does not reveal the deck on a return to a later history entry", async () => {
    stubRoutes();
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt(["/", "/matchups?window=30d&deck=monster-tron-1bc68613"]);

    await screen.findByRole("grid");

    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("gives the first history entry a key of its own without moving focus or scrolling to the top", async () => {
    stubRoutes();
    stubWidth(1280);
    stubScroll();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderWithQueries(
      <MemoryRouter
        initialEntries={["/matchups?window=30d&deck=monster-tron-1bc68613"]}
      >
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="matchups"
              element={
                <>
                  <MatchupsPage />
                  <Address />
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("grid");

    expect(
      screen.getByText(
        "Address: ?window=30d&deck=monster-tron-1bc68613, REPLACE",
      ),
    ).toBeTruthy();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it("writes a chosen deck in place of the history entry and reveals it, and All decks removes it", async () => {
    stubRoutes();
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d");

    await screen.findByRole("grid");
    expect(chosen()).toBe("All decks");
    expect(spotlit()).toEqual([]);

    fireEvent.change(picker(), { target: { value: "naya-gates-af060ab8" } });

    expect(
      screen.getByText(
        "Address: ?window=30d&deck=naya-gates-af060ab8, REPLACE",
      ),
    ).toBeTruthy();
    expect(spotlit()).toEqual(["Naya Gates"]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("rowheader", { name: "Naya Gates" }),
    );

    fireEvent.change(picker(), { target: { value: "monster-tron-1bc68613" } });

    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.contexts[1]).toBe(
      screen.getByRole("rowheader", { name: "Monster Tron" }),
    );

    fireEvent.change(picker(), { target: { value: "" } });

    expect(screen.getByText("Address: ?window=30d, REPLACE")).toBeTruthy();
    expect(spotlit()).toEqual([]);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("keeps the deck through a window change, without revealing it again", async () => {
    stubRoutes(undefined, () => Response.json(matrix));
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d&deck=monster-tron-1bc68613");
    await screen.findByText("11 Sept to 10 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByRole("grid", { name: /7d window/ })).toBeTruthy();
    expect(
      screen.getByText("Address: ?window=7d&deck=monster-tron-1bc68613, PUSH"),
    ).toBeTruthy();
    expect(spotlit()).toEqual(["Monster Tron"]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("does not reveal a deck that a window change brings into the top decks", async () => {
    const [first, second, third, fourth] = matrix.decks;
    const withStompy = {
      ...matrix,
      decks: [
        first,
        second,
        third,
        { ...fourth, slug: "stompy-12345678", name: "Mono Green Stompy" },
      ],
    };
    stubRoutes(
      undefined,
      () => Response.json(matrix),
      () => Response.json(withStompy),
    );
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByRole("grid", { name: /7d window/ })).toBeTruthy();
    expect(spotlit()).toEqual(["Mono Green Stompy"]);
    expect(notices()).toEqual([]);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("waits for the window to load before it reveals a deck chosen during the load", async () => {
    let answer: (response: Response) => void = () => {};
    stubRoutes(
      undefined,
      () => Response.json(matrix),
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    stubWidth(1280);
    const scrollIntoView = stubScroll();
    renderAt("/matchups?window=30d");
    await screen.findByText("11 Sept to 10 Oct 2026");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    await screen.findByText("Loading the 7d window.");
    fireEvent.change(picker(), { target: { value: "naya-gates-af060ab8" } });

    expect(spotlit()).toEqual(["Naya Gates"]);
    expect(scrollIntoView).not.toHaveBeenCalled();

    answer(Response.json(matrix));

    expect(await screen.findByRole("grid", { name: /7d window/ })).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("rowheader", { name: "Naya Gates" }),
    );
  });

  it("counts an empty deck as none", async () => {
    stubRoutes();
    renderAt("/matchups?window=30d&deck=");

    await screen.findByRole("grid");

    expect(chosen()).toBe("All decks");
    expect(spotlit()).toEqual([]);
  });

  it("names a deck outside the top decks once its detail arrives, with no spotlight, and keeps it in the address", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchMock = stubRoutes(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    const status = recordStatus();

    await waitFor(() => {
      expect(notices()).toEqual([
        "line: This deck isn't in the top 4 for the selected time window.",
      ]);
    });
    expect(chosen()).toBe("This deck (not in the top 4)");
    expect(spotlit()).toEqual([]);

    answer(Response.json(STOMPY));

    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );
    expect(status).toEqual([
      "Loading the 30d window.",
      "",
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    ]);
    expect(chosen()).toBe("Mono Green Stompy (not in the top 4)");
    expect(
      screen.getByText("Address: ?window=30d&deck=stompy-12345678, REPLACE"),
    ).toBeTruthy();
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "/api/metagame/Pauper/decks/stompy-12345678?window=30d&population=rated",
    );
  });

  it("does not judge the deck missing from the previous window while another one loads", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchMock = stubRoutes(
      undefined,
      () => Response.json(matrix),
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(notices()).toEqual([]);
    expect(chosen()).toBe("Mono Green Stompy (not in the top 4)");
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).startsWith("/api/metagame/"),
      ),
    ).toHaveLength(1);

    answer(Response.json(matrix));

    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );
    expect(chosen()).toBe("Mono Green Stompy (not in the top 4)");
    await waitFor(() => {
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(
        "/api/metagame/Pauper/decks/stompy-12345678?window=7d&population=rated",
      );
    });
  });

  it("announces the loading window, then that the deck is outside the top decks, on a first visit", async () => {
    stubRoutes();
    renderAt("/matchups?window=30d&deck=stompy-12345678");

    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 30d window.",
    );

    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );
  });

  it("lets the reader clear a deck missing from the previous window while another one loads", async () => {
    stubRoutes(
      undefined,
      () => Response.json(matrix),
      () => new Promise<Response>(() => {}),
    );
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    await screen.findByText("Loading the 7d window.");

    expect(chosen()).toBe("Mono Green Stompy (not in the top 4)");

    fireEvent.change(picker(), { target: { value: "" } });

    expect(screen.getByText("Address: ?window=7d, REPLACE")).toBeTruthy();
    expect(chosen()).toBe("All decks");
  });

  it("announces a deck missing from the next window once that window's detail has settled", async () => {
    let details = 0;
    let answer: (response: Response) => void = () => {};
    stubRoutes(() => {
      details += 1;

      if (details === 1) {
        return Response.json(STOMPY);
      }

      return new Promise<Response>((resolve) => (answer = resolve));
    });
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );
    const status = recordStatus();

    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    await screen.findByRole("grid", { name: /7d window/ });
    await waitFor(() => {
      expect(details).toBe(2);
    });
    expect(screen.getByRole("status").textContent).toBe("");

    answer(Response.json(STOMPY));

    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );
    expect(status).toEqual([
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
      "Loading the 7d window.",
      "",
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    ]);
  });

  it("names the deck This deck when its detail fails", async () => {
    stubRoutes(() => Response.json({ error: "Unknown deck" }, { status: 404 }));
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    const status = recordStatus();

    await screen.findByRole("grid");
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitForNotice(
      "This deck isn't in the top 4 for the selected time window.",
    );
    expect(status.at(-1)).toBe(
      "This deck isn't in the top 4 for the selected time window.",
    );
  });

  it("lets any choice replace a deck outside the top decks, All decks included", async () => {
    stubRoutes();
    renderAt("/matchups?window=30d&deck=stompy-12345678");
    await waitForNotice(
      "Mono Green Stompy isn't in the top 4 for the selected time window.",
    );

    fireEvent.change(picker(), { target: { value: "" } });

    expect(screen.getByText("Address: ?window=30d, REPLACE")).toBeTruthy();
    expect(chosen()).toBe("All decks");
    expect(notices()).toEqual([]);
    expect(screen.queryByRole("option", { name: /not in the top/ })).toBeNull();
  });

  it("requests no deck detail for a deck in the top decks", async () => {
    const fetchMock = stubRoutes();
    stubWidth(1280);
    stubScroll();
    renderAt("/matchups?window=30d&deck=affinity-e93f5f74");

    await screen.findByRole("grid");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(notices()).toEqual([]);
  });

  it("reveals the deck after a link from another page has scrolled that page to the top", async () => {
    const order: string[] = [];
    vi.spyOn(window, "scrollTo").mockImplementation(() => {
      order.push("top");
    });
    stubWidth(1280);
    stubScroll().mockImplementation(() => {
      order.push("deck");
    });
    const client = createQueryClient();
    client.setQueryData(["matchups", "30d"], matrix);

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/decks/affinity-e93f5f74?window=30d"]}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="decks/:slug"
                element={
                  <>
                    <h1 tabIndex={-1}>Affinity</h1>
                    <Link to="/matchups?window=30d&deck=monster-tron-1bc68613">
                      See Monster Tron
                    </Link>
                  </>
                }
              />
              <Route path="matchups" element={<MatchupsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("link", { name: "See Monster Tron" }));

    expect(screen.getByRole("grid")).toBeTruthy();
    expect(order).toEqual(["top", "deck"]);
  });
});
