import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import { fetchDeck, fetchDecks, fetchSeries } from "./endpoints";

function stubFetch(): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>((input) =>
    Promise.resolve(Response.json({ requested: String(input) })),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the top decks of a window by share", async () => {
    const fetchMock = stubFetch();

    await fetchDecks("7d", new AbortController().signal);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/decks?window=7d&population=rated&sort=share&dir=desc&page=1&pageSize=24",
    );
  });

  it("fetches the share series of a window", async () => {
    const fetchMock = stubFetch();

    await fetchSeries("season", new AbortController().signal);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/share-series?window=season&population=rated",
    );
  });

  it("fetches one deck's detail for a window", async () => {
    const fetchMock = stubFetch();

    await fetchDeck("affinity-e93f5f74", "14d", new AbortController().signal);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/metagame/Pauper/decks/affinity-e93f5f74?window=14d&population=rated",
    );
  });
});
