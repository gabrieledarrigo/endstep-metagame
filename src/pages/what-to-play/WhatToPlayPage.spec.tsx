import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { stubWidth } from "../../../test/stubWidth";
import { WhatToPlayPage } from "./WhatToPlayPage";

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

const MADNESS = "mono-red-madness-60596e8a";

function Address() {
  const { pathname, search } = useLocation();

  return (
    <p>
      Address: {pathname + search}, {useNavigationType()}
    </p>
  );
}

function renderAt(path: string): void {
  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <WhatToPlayPage />
      <Address />
    </MemoryRouter>,
  );
}

function address(): string {
  return screen.getByText(/^Address: /).textContent ?? "";
}

function rankingList(): HTMLElement {
  const panel = screen
    .getByRole("heading", { name: "Expected match win rate" })
    .closest(".expected");

  return within(panel as HTMLElement).getByRole("list");
}

function panelTitles(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "");
}

function pickTitle(): HTMLElement {
  return screen.getByRole("heading", { level: 2, name: /^Play / });
}

function ranked(): string[] {
  return within(rankingList())
    .getAllByRole("link")
    .map((link) => link.textContent ?? "");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WhatToPlayPage", () => {
  it("announces the loading window, then gives the pick, the ranking and the window's dates", async () => {
    const fetchMock = stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d");

    expect(
      screen.getByRole("heading", { level: 1, name: "What to play?" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 30d window.",
    );

    expect(
      await screen.findByText(/^Based on the last 30 days\./),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(pickTitle().textContent).toBe(
      "Play Affinity, Monster Tron or Naya Gates!",
    );
    expect(ranked()).toEqual([
      "Affinity",
      "Monster Tron",
      "Naya Gates",
      "Mono Red Madness",
    ]);
    expect(screen.getByText("Metagame of the last 30 days")).toBeTruthy();
    expect(screen.getByText("11 Sept to 10 Oct 2026")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/matchups?window=30d");
  });

  it("names the page in the document title", async () => {
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d");

    await waitFor(() => {
      expect(document.title).toBe("What to play? · Pauper Endstep metagame");
    });
  });

  it("links every deck to its page with the current window", async () => {
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=14d");

    await screen.findByText(/^Based on the last 14 days\./);

    expect(
      within(rankingList())
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/decks/affinity-e93f5f74?window=14d",
      "/decks/monster-tron-1bc68613?window=14d",
      "/decks/naya-gates-af060ab8?window=14d",
      "/decks/mono-red-madness-60596e8a?window=14d",
    ]);
    expect(
      within(pickTitle())
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/decks/affinity-e93f5f74?window=14d",
      "/decks/monster-tron-1bc68613?window=14d",
      "/decks/naya-gates-af060ab8?window=14d",
    ]);
  });

  it("shows a skeleton for the pick and the ranking while loading, and the explanation at once", () => {
    stubApi(() => new Promise<Response>(() => {}));
    renderAt("/what-to-play?window=30d");

    expect(screen.getByText("Our pick").closest('[aria-busy="true"]')).toBe(
      screen.getByText("Our pick").parentElement,
    );
    expect(
      screen
        .getByRole("heading", { name: "Expected match win rate" })
        .closest('[aria-busy="true"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "How the numbers are made" }),
    ).toBeTruthy();
  });

  it("keeps the pick and the ranking on screen, dimmed and busy, while another window loads, and holds back the window's period and dates", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi(
      () => Response.json(matrix),
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderAt("/what-to-play?window=30d");
    await screen.findByText(/^Based on the last 30 days\./);

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
    expect(pickTitle().closest('[aria-busy="true"]')).toBeTruthy();
    expect(rankingList().closest('[aria-busy="true"]')).toBeTruthy();
    expect(
      screen
        .getByRole("heading", { name: "How the numbers are made" })
        .closest("[aria-busy]"),
    ).toBeNull();
    expect(screen.queryByText(/Based on/)).toBeNull();
    expect(screen.queryByText(/Metagame of/)).toBeNull();
    expect(screen.queryByText("11 Sept to 10 Oct 2026")).toBeNull();

    answer(Response.json(matrix));

    expect(await screen.findByText(/^Based on the last 7 days\./)).toBeTruthy();
    expect(screen.getByText("Metagame of the last 7 days")).toBeTruthy();
    expect(pickTitle().closest("[aria-busy]")).toBeNull();
  });

  it("does not retry a failed build on its own, and retries when asked", async () => {
    const fetchMock = stubApi(
      () => Response.json({ error: "x" }, { status: 502 }),
      () => Response.json(matrix),
    );
    renderAt("/what-to-play?window=30d");

    expect(
      await screen.findByRole("heading", {
        name: "The ranking could not be loaded",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Endstep did not respond.")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "How the numbers are made" }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText(/^Based on the last 30 days\./),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a rate limit as a rate limit", async () => {
    stubApi(() => Response.json({ error: "x" }, { status: 429 }));
    renderAt("/what-to-play?window=30d");

    expect(
      await screen.findByText(/^Endstep's rate limit was reached\./),
    ).toBeTruthy();
  });

  it("offers a longer window when this one has no decks", async () => {
    const fetchMock = stubApi(
      () => Response.json({ ...matrix, decks: [], cells: {} }),
      () => Response.json(matrix),
    );
    renderAt("/what-to-play?window=1d");

    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to 7d" }),
    );

    expect(await screen.findByText(/^Based on the last 7 days\./)).toBeTruthy();
    expect(String(fetchMock.mock.calls[1][0])).toBe("/api/matchups?window=7d");
  });

  it("applies the changes in the address to the pick and the ranking, against the window's own places", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(`/what-to-play?window=30d&meta=${MADNESS}:-5`);

    expect(
      await screen.findByText("Based on the metagame you set."),
    ).toBeTruthy();
    expect(pickTitle().textContent).toBe(
      "Play Monster Tron, Affinity or Naya Gates!",
    );
    expect(screen.getByText("The metagame you set")).toBeTruthy();
    expect(
      within(rankingList())
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "1Monster Tron51.1%, likely between 47.0% and 55.1%↑1, up 1",
      "2Affinity50.1%, likely between 46.5% and 53.7%↓1, down 1",
      "3Naya Gates50.0%, likely between 19.5% and 80.5%",
      "4Mono Red Madness46.8%, likely between 42.8% and 50.8%",
    ]);
    expect(screen.getByText("was 6.8%")).toBeTruthy();
    expect(screen.getByText("1.8%")).toBeTruthy();
  });

  it("updates the pick, the ranking and the address at once on a press, and keeps focus on the button", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(`/what-to-play?window=30d&meta=${MADNESS}:-5`);
    await screen.findByText("Based on the metagame you set.");

    const less = screen.getByRole("button", { name: "Less Mono Red Madness" });
    less.focus();
    fireEvent.click(less);

    expect(pickTitle().textContent).toBe(
      "Play Monster Tron, Naya Gates or Affinity!",
    );
    expect(ranked()).toEqual([
      "Monster Tron",
      "Naya Gates",
      "Affinity",
      "Mono Red Madness",
    ]);
    expect(address()).toBe(
      `Address: /what-to-play?window=30d&meta=${MADNESS}:-6, REPLACE`,
    );
    expect(less.isConnected).toBe(true);
    expect(document.activeElement).toBe(less);
  });

  it("reads the encoded form of the address too", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(`/what-to-play?window=30d&meta=${MADNESS}%3A-5`);

    expect(
      await screen.findByText("Based on the metagame you set."),
    ).toBeTruthy();
    expect(screen.getByText("was 6.8%")).toBeTruthy();
  });

  it("ignores a malformed entry, an unknown deck and a change of zero, and writes only what applies at the next press", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(
      `/what-to-play?window=30d&meta=bad,elves-262fdcbd:3,affinity-e93f5f74:0,${MADNESS}:-5`,
    );

    expect(
      await screen.findByText("Based on the metagame you set."),
    ).toBeTruthy();
    expect(screen.getAllByText(/^was /)).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Less Mono Red Madness" }),
    );

    expect(address()).toBe(
      `Address: /what-to-play?window=30d&meta=${MADNESS}:-6, REPLACE`,
    );
  });

  it("counts a change past zero as the share rounded up, and writes the counted change at the next press", async () => {
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d&meta=naya-gates-af060ab8:-5");
    await screen.findByText("Based on the metagame you set.");

    expect(screen.getByText("0.0%")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Less Naya Gates" })
        .getAttribute("aria-disabled"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "More Affinity" }));

    expect(address()).toBe(
      "Address: /what-to-play?window=30d&meta=affinity-e93f5f74:1,naya-gates-af060ab8:-2, REPLACE",
    );
  });

  it("opens the window's own metagame when the changes would empty it", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(
      `/what-to-play?window=30d&meta=affinity-e93f5f74:-10,${MADNESS}:-7,monster-tron-1bc68613:-5,naya-gates-af060ab8:-2`,
    );

    expect(
      await screen.findByText(
        "Based on the last 30 days. Change the metagame to match what you expect.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/^was /)).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it("removes the changes from the address on Reset, and moves focus to the panel's title", async () => {
    stubApi(() => Response.json(matrix));
    renderAt(`/what-to-play?window=30d&meta=${MADNESS}:-5,elves-262fdcbd:3`);
    await screen.findByText("Based on the metagame you set.");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(address()).toBe("Address: /what-to-play?window=30d, REPLACE");
    expect(
      screen.getByText(
        "Based on the last 30 days. Change the metagame to match what you expect.",
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "The metagame you expect" }),
    );
  });

  it("keeps the changes, readable, across a window change, and names them while the window loads", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi(
      () => Response.json(matrix),
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderAt(`/what-to-play?window=30d&meta=${MADNESS}:-5`);
    await screen.findByText("Based on the metagame you set.");

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(await screen.findByText("Loading the 7d window.")).toBeTruthy();
    expect(address()).toBe(
      `Address: /what-to-play?window=7d&meta=${MADNESS}:-5, PUSH`,
    );
    expect(screen.getByText("Based on the metagame you set.")).toBeTruthy();

    answer(Response.json(matrix));

    await waitFor(() => {
      expect(pickTitle().closest("[aria-busy]")).toBeNull();
    });
    expect(screen.getByText("was 6.8%")).toBeTruthy();
  });

  it("puts the ranking and the open metagame side by side from 1,100px", async () => {
    stubWidth(1100);
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d");
    await screen.findByText(/^Based on the last 30 days\./);

    expect(panelTitles()).toEqual([
      "Play Affinity, Monster Tron or Naya Gates!",
      "Expected match win rate",
      "The metagame you expect",
      "How the numbers are made",
    ]);
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
    expect(screen.getByRole("button", { name: "More Affinity" })).toBeTruthy();
  });

  it("puts the metagame first below 1,100px, folded into its heading until Change opens it", async () => {
    stubWidth(1099);
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d");
    await screen.findByText(/^Based on the last 30 days\./);

    expect(panelTitles()).toEqual([
      "Play Affinity, Monster Tron or Naya Gates!",
      "The metagame you expect",
      "Expected match win rate",
      "How the numbers are made",
    ]);
    expect(screen.queryByRole("button", { name: "More Affinity" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByRole("button", { name: "More Affinity" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("button", { name: "More Affinity" })).toBeNull();
  });

  it("keeps the metagame open across the breakpoint", async () => {
    const resize = stubWidth(1280);
    stubApi(() => Response.json(matrix));
    renderAt("/what-to-play?window=30d");
    await screen.findByText(/^Based on the last 30 days\./);

    act(() => resize(800));
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    act(() => resize(1280));
    act(() => resize(800));

    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("shows the folded metagame's skeleton first below 1,100px while loading", () => {
    stubWidth(360);
    stubApi(() => new Promise<Response>(() => {}));
    renderAt("/what-to-play?window=30d");

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "The metagame you expect",
      "Expected match win rate",
      "How the numbers are made",
    ]);
    expect(
      screen
        .getByRole("heading", { name: "The metagame you expect" })
        .closest('[aria-busy="true"]'),
    ).toBeTruthy();
  });
});
