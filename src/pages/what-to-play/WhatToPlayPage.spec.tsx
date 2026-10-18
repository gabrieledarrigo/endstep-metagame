import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
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

function renderAt(path: string): void {
  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <WhatToPlayPage />
    </MemoryRouter>,
  );
}

function pickTitle(): HTMLElement {
  return screen.getByRole("heading", { level: 2, name: /^Play / });
}

function ranked(): string[] {
  return within(screen.getByRole("list"))
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

    expect(await screen.findByText(/^Based on the last 30 days\./)).toBeTruthy();
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
      within(screen.getByRole("list"))
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
    expect(screen.getByRole("list").closest('[aria-busy="true"]')).toBeTruthy();
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

    expect(await screen.findByText(/^Based on the last 30 days\./)).toBeTruthy();
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
});
