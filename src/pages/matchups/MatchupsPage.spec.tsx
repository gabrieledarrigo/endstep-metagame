import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import { renderWithQueries } from "../../../test/renderWithQueries";
import { MatchupsPage } from "./MatchupsPage";

function stubApi(...responses: (() => Response)[]): Mock<typeof fetch> {
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
      <MatchupsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
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
    expect(screen.getByText("11 Sep to 10 Oct 2026")).toBeTruthy();
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
});
