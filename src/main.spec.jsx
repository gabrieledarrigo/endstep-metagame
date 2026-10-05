import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import decks from "./test/fixtures/decks.json";
import series from "./test/fixtures/share-series.json";

function stubApi() {
  let failNextDecks = true;
  const held = new Set();
  const waiting = [];

  const fetchMock = vi.fn((input, init) => {
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
    return new Promise((resolve, reject) => {
      waiting.push({
        window: url.searchParams.get("window"),
        resolve: () => resolve(Response.json(body)),
      });
      init.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    hold: (...windows) => windows.forEach((window) => held.add(window)),
    release: (window) => {
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
  it("loads through the proxy, recovers on retry, and never shows stale data while a window loads", async () => {
    const api = stubApi();
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main.jsx");

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

    expect(screen.queryByText("Monster Tron")).toBeNull();

    api.release("30d");

    expect((await screen.findAllByText("Monster Tron")).length).toBeGreaterThan(
      1,
    );

    const urls = api.fetchMock.mock.calls.map(
      ([input]) => new URL(String(input), "http://localhost"),
    );
    expect(urls.every((url) => url.pathname.startsWith("/api/metagame/"))).toBe(
      true,
    );
    expect(urls[0].searchParams.get("window")).toBe("30d");
    expect(urls[0].searchParams.get("pageSize")).toBe("24");
  });
});
