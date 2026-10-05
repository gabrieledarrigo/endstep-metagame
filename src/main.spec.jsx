import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import decks from "./test/fixtures/decks.json";
import series from "./test/fixtures/share-series.json";

function stubApi() {
  let deckRequests = 0;
  const fetchMock = vi.fn(async (input) => {
    const url = new URL(String(input), "http://localhost");

    if (url.pathname === "/api/metagame/Pauper/decks") {
      deckRequests += 1;
      if (deckRequests === 1) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json(decks);
    }
    if (url.pathname === "/api/metagame/Pauper/share-series") {
      return Response.json(series);
    }
    return Response.json({ error: "Unexpected request" }, { status: 500 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the overview page", () => {
  it("loads through the proxy, shows a failed section, and recovers on retry", async () => {
    const fetchMock = stubApi();
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main.jsx");

    expect(
      await screen.findByRole("heading", {
        name: "The deck grid could not be loaded",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Share over time" }),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);

    expect((await screen.findAllByText("Monster Tron")).length).toBeGreaterThan(
      1,
    );
    expect(
      screen.queryByRole("heading", {
        name: "The deck grid could not be loaded",
      }),
    ).toBeNull();

    const urls = fetchMock.mock.calls.map(
      ([input]) => new URL(String(input), "http://localhost"),
    );
    expect(urls.every((url) => url.pathname.startsWith("/api/metagame/"))).toBe(
      true,
    );
    expect(urls[0].searchParams.get("window")).toBe("30d");
    expect(urls[0].searchParams.get("pageSize")).toBe("24");
  });
});
