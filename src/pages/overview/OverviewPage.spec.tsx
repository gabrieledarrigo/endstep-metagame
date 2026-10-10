import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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

type Answer = (window: string | null) => Response;

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

function renderAt(path: string): void {
  renderWithQueries(
    <MemoryRouter initialEntries={[path]}>
      <OverviewPage />
    </MemoryRouter>,
  );
}

function pressedWindow(): string | null | undefined {
  return screen
    .getAllByRole("button", { pressed: true })
    .find((button) => button.closest("[role='group']"))?.textContent;
}

beforeEach(() => {
  sizeCharts();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OverviewPage", () => {
  it("announces the loading window, then shows every section", async () => {
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
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByText("236,728")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    for (const name of [
      "Share over time",
      "Meta share by deck",
      "Win rate against share",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
  });

  it("requests the window the reader picks", async () => {
    const fetchMock = stubApi(() => Response.json(decks));
    renderAt("/?window=30d");
    await screen.findByRole("region", { name: "Decks by meta share" });

    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(pressedWindow()).toBe("7d");
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("window=7d"),
      ),
    ).toBe(true);
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
      "The deck table could not be loaded",
      "Meta share by deck could not be loaded",
      "Win rate against share could not be loaded",
    ]) {
      expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
    }
    expect(
      screen.getByRole("heading", { name: "Share over time" }),
    ).toBeTruthy();
  });
});
