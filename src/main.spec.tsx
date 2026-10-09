import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import decks from "../test/fixtures/decks.json";
import series from "../test/fixtures/share-series.json";

function stubApi() {
  let failNextDecks = true;
  const held = new Set<string | null>();
  const waiting: { window: string | null; resolve: () => void }[] = [];

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
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
    hold: (...windows: string[]) =>
      windows.forEach((window) => held.add(window)),
    release: (window: string) => {
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
  it("loads through the proxy, recovers on retry, and never shows stale or late data while a window loads", async () => {
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

    api.hold("7d", "30d");
    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    fireEvent.click(await screen.findByRole("button", { name: "30d" }));

    expect(screen.queryAllByText("Monster Tron")).toHaveLength(0);

    api.release("30d");

    expect((await screen.findAllByText("Monster Tron")).length).toBeGreaterThan(
      1,
    );

    api.release("7d");
    await new Promise((resolve) => setTimeout(resolve, 50));

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
