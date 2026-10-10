import { fireEvent, screen } from "@testing-library/react";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import decks from "../test/fixtures/decks.json";
import series from "../test/fixtures/share-series.json";

type StubApi = {
  fetchMock: Mock<typeof fetch>;
  hold: (...windows: string[]) => void;
  release: (window: string) => void;
};

function stubApi(): StubApi {
  let failNextDecks = true;
  const held = new Set<string | null>();
  const waiting: { window: string | null; resolve: () => void }[] = [];

  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = new URL(String(input), "http://localhost");
    const body = url.pathname === "/api/metagame/Pauper/decks" ? decks : series;

    if (url.pathname.endsWith("/decks") && failNextDecks) {
      failNextDecks = false;
      return Promise.resolve(
        Response.json({ error: "Not found" }, { status: 404 }),
      );
    }
    if (!held.has(url.searchParams.get("window"))) {
      return Promise.resolve(Response.json(body));
    }
    return new Promise<Response>((resolve) => {
      waiting.push({
        window: url.searchParams.get("window"),
        resolve: () => resolve(Response.json(body)),
      });
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    hold: (...windows: string[]): void =>
      windows.forEach((window) => held.add(window)),
    release: (window: string): void => {
      held.delete(window);
      waiting
        .filter((request) => request.window === window)
        .forEach((request) => request.resolve());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the overview page", () => {
  it("loads through the proxy, recovers on retry, shows a window it has seen at once, and ignores a late response for a window the reader left", async () => {
    const api = stubApi();
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    await screen.findByRole("heading", {
      name: "The deck grid could not be loaded",
    });
    await screen.findByRole("button", { name: "Affinity", pressed: true });

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);

    expect((await screen.findAllByText("Monster Tron")).length).toBeGreaterThan(
      1,
    );
    expect(
      screen.queryByRole("heading", {
        name: "The deck grid could not be loaded",
      }),
    ).toBeNull();

    const decksRequests = (window: string): number =>
      api.fetchMock.mock.calls.filter(([input]) => {
        const url = new URL(String(input), "http://localhost");
        return (
          url.pathname === "/api/metagame/Pauper/decks" &&
          url.searchParams.get("window") === window
        );
      }).length;

    api.hold("7d");
    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(screen.queryAllByText("Monster Tron")).toHaveLength(0);

    fireEvent.click(await screen.findByRole("button", { name: "30d" }));

    expect(screen.getAllByText("Monster Tron").length).toBeGreaterThan(1);
    expect(decksRequests("30d")).toBe(2);

    api.release("7d");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      screen.getByRole("button", { name: "30d", pressed: true }),
    ).toBeTruthy();
    expect(screen.getAllByText("Monster Tron").length).toBeGreaterThan(1);

    const requested = api.fetchMock.mock.calls.map(([input]) => String(input));
    expect(requested.every((url) => url.startsWith("/api/metagame/"))).toBe(
      true,
    );
    const urls = requested.map((url) => new URL(url, "http://localhost"));
    expect(urls[0].searchParams.get("window")).toBe("30d");
    expect(urls[0].searchParams.get("pageSize")).toBe("24");
  });
});
