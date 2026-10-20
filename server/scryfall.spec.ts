import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const SCRYFALL = "https://api.scryfall.com/cards/collection";
const BOUND = 1000;
const BARGAIN_ART =
  "https://cards.scryfall.io/art_crop/front/6/3/6338942d-d650-4571-8ec6-4d658792c53e.jpg?1783923877";
const GUTTERSNIPE_ART =
  "https://cards.scryfall.io/art_crop/front/f/6/f6bb1ffc-2251-4655-b8f9-4c8047dd5d5f.jpg?1785497556";
const DELVER_ART =
  "https://cards.scryfall.io/art_crop/front/6/9/6904ea20-e504-47da-95a0-08739fdde260.jpg?1783908173";

type FindArt = (typeof import("./scryfall"))["findArt"];

describe("findArt", () => {
  let findArt: FindArt;

  beforeEach(async () => {
    vi.resetModules();
    findArt = (await import("./scryfall")).findArt;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function card(name: string, artCrop: string): object {
    return { name, image_uris: { art_crop: artCrop } };
  }

  function collection(
    data: object[],
    notFound: string[] = [],
  ): () => Promise<Response> {
    return async () =>
      Response.json({
        object: "list",
        not_found: notFound.map((name) => ({ name })),
        data,
      });
  }

  function scryfall(answer: () => Promise<Response>): Mock<typeof fetch> {
    const fetchMock = vi.fn<typeof fetch>(answer);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function scryfallNames(fetchMock: Mock<typeof fetch>): string[][] {
    return fetchMock.mock.calls.map(([, init]) =>
      (
        JSON.parse(String(init?.body)) as { identifiers: { name: string }[] }
      ).identifiers.map(({ name }) => name),
    );
  }

  it("asks Scryfall once, each name once whatever its case, and keys each address by the name as given", async () => {
    const fetchMock = scryfall(
      collection([
        card("Reckoner's Bargain", BARGAIN_ART),
        card("Guttersnipe", GUTTERSNIPE_ART),
      ]),
    );

    const found = await findArt(
      ["Reckoner's Bargain", "Guttersnipe", "reckoner's bargain"],
      BOUND,
    );

    expect(fetchMock).toHaveBeenCalledWith(SCRYFALL, {
      method: "POST",
      headers: {
        "User-Agent":
          "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: '{"identifiers":[{"name":"Reckoner\'s Bargain"},{"name":"Guttersnipe"}]}',
      signal: expect.any(AbortSignal),
    });
    expect(found.complete).toBe(true);
    expect(Object.fromEntries(found.art)).toEqual({
      "Reckoner's Bargain": BARGAIN_ART,
      Guttersnipe: GUTTERSNIPE_ART,
      "reckoner's bargain": BARGAIN_ART,
    });
  });

  it("sends nothing for no names", async () => {
    const fetchMock = scryfall(collection([]));

    const found = await findArt([], BOUND);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(found).toEqual({ art: new Map(), complete: true });
  });

  it("matches a double-faced card by its front face, ignoring case, and takes the front face's art", async () => {
    scryfall(
      collection([
        {
          name: "Delver of Secrets // Insectile Aberration",
          card_faces: [
            {
              name: "Delver of Secrets",
              image_uris: { art_crop: DELVER_ART },
            },
            {
              name: "Insectile Aberration",
              image_uris: {
                art_crop: DELVER_ART.replace("/front/", "/back/"),
              },
            },
          ],
        },
      ]),
    );

    const found = await findArt(["delver of secrets"], BOUND);

    expect(found.art.get("delver of secrets")).toBe(DELVER_ART);
  });

  it.each([
    [
      "a back face's name the back face's art",
      "Insectile Aberration",
      "/back/",
    ],
    [
      "a double-faced card's full name the front face's art",
      "Delver of Secrets // Insectile Aberration",
      "/front/",
    ],
  ])("gives %s", async (_, name, side) => {
    const back = DELVER_ART.replace("/front/", "/back/");
    scryfall(
      collection([
        {
          name: "Delver of Secrets // Insectile Aberration",
          card_faces: [
            { name: "Delver of Secrets", image_uris: { art_crop: DELVER_ART } },
            { name: "Insectile Aberration", image_uris: { art_crop: back } },
          ],
        },
      ]),
    );

    const found = await findArt([name], BOUND);

    expect(found.art.get(name)).toBe(DELVER_ART.replace("/front/", side));
  });

  it.each([
    [
      "a second card without art",
      [card("Guttersnipe", GUTTERSNIPE_ART), { name: "Guttersnipe" }],
    ],
    [
      "a second card off the CDN",
      [
        card("Guttersnipe", GUTTERSNIPE_ART),
        card("Guttersnipe", "https://example.com/guttersnipe.jpg"),
      ],
    ],
    [
      "a second card with other art",
      [
        card("Guttersnipe", GUTTERSNIPE_ART),
        card("Guttersnipe", GUTTERSNIPE_ART.replace("/front/", "/back/")),
      ],
    ],
    [
      "a first card without art",
      [{ name: "Guttersnipe" }, card("Guttersnipe", GUTTERSNIPE_ART)],
    ],
    [
      "a reversible card's second face",
      [
        {
          name: "Guttersnipe // Guttersnipe",
          card_faces: [
            { name: "Guttersnipe", image_uris: { art_crop: GUTTERSNIPE_ART } },
            {
              name: "Guttersnipe",
              image_uris: {
                art_crop: GUTTERSNIPE_ART.replace("/front/", "/back/"),
              },
            },
          ],
        },
      ],
    ],
  ])(
    "gives a name the first art crop on the CDN that matches it, with %s",
    async (_, cards) => {
      scryfall(collection(cards));

      const found = await findArt(["Guttersnipe"], BOUND);

      expect(found.complete).toBe(true);
      expect(found.art.get("Guttersnipe")).toBe(GUTTERSNIPE_ART);
    },
  );

  it.each([
    [
      "a split card",
      "Fire // Ice",
      "Fire",
      {
        name: "Fire // Ice",
        image_uris: { art_crop: GUTTERSNIPE_ART },
        card_faces: [{ name: "Fire" }, { name: "Ice" }],
      },
      GUTTERSNIPE_ART,
    ],
    [
      "a double-faced card",
      "Delver of Secrets // Insectile Aberration",
      "Delver of Secrets",
      {
        name: "Delver of Secrets // Insectile Aberration",
        card_faces: [
          { name: "Delver of Secrets", image_uris: { art_crop: DELVER_ART } },
          { name: "Insectile Aberration" },
        ],
      },
      DELVER_ART,
    ],
  ])(
    "asks for %s by its first half and matches the answer by its full name",
    async (_, name, asked, answer, art) => {
      const fetchMock = scryfall(collection([answer]));

      const found = await findArt([name], BOUND);

      expect(scryfallNames(fetchMock)).toEqual([[asked]]);
      expect(found.art.get(name)).toBe(art);
    },
  );

  it("gives a face without its own image the card's art, as for an adventure", async () => {
    const giant =
      "https://cards.scryfall.io/art_crop/front/1/a/1a8bdc8b-bonecrusher-giant.jpg?1";
    scryfall(
      collection([
        {
          name: "Bonecrusher Giant // Stomp",
          image_uris: { art_crop: giant },
          card_faces: [{ name: "Bonecrusher Giant" }, { name: "Stomp" }],
        },
      ]),
    );

    const found = await findArt(["Stomp"], BOUND);

    expect(found.art.get("Stomp")).toBe(giant);
  });

  it.each([
    ["Scryfall lists in not_found", collection([], ["Guttersnipe"])],
    [
      "Scryfall answers with another spelling",
      collection([
        card(
          "Güttersnipe",
          "https://cards.scryfall.io/art_crop/front/1/2/12345678-guttersnipe.jpg?1",
        ),
      ]),
    ],
    [
      "has an address outside Scryfall's CDN",
      collection([card("Guttersnipe", "https://example.com/guttersnipe.jpg")]),
    ],
    ["has no art crop", collection([{ name: "Guttersnipe", image_uris: {} }])],
  ])(
    "treats a name %s as not found: no address, a complete answer, and no second request",
    async (_, answer) => {
      const fetchMock = scryfall(answer);

      const first = await findArt(["Guttersnipe"], BOUND);
      const second = await findArt(["Guttersnipe"], BOUND);

      expect(first).toEqual({ art: new Map(), complete: true });
      expect(second).toEqual({ art: new Map(), complete: true });
      expect(scryfallNames(fetchMock)).toEqual([["Guttersnipe"]]);
    },
  );

  it("asks Scryfall only for the names it has not seen", async () => {
    const first = scryfall(
      collection([card("Reckoner's Bargain", BARGAIN_ART)]),
    );
    await findArt(["Reckoner's Bargain"], BOUND);

    const second = scryfall(collection([card("Guttersnipe", GUTTERSNIPE_ART)]));
    const found = await findArt(["Reckoner's Bargain", "Guttersnipe"], BOUND);

    expect(scryfallNames(first)).toEqual([["Reckoner's Bargain"]]);
    expect(scryfallNames(second)).toEqual([["Guttersnipe"]]);
    expect(Object.fromEntries(found.art)).toEqual({
      "Reckoner's Bargain": BARGAIN_ART,
      Guttersnipe: GUTTERSNIPE_ART,
    });
  });

  it.each([1000, 3000])(
    "gives the lookup the bound it is passed, %i ms",
    async (bound) => {
      scryfall(collection([card("Guttersnipe", GUTTERSNIPE_ART)]));
      const timeout = vi.spyOn(AbortSignal, "timeout");

      await findArt(["Guttersnipe"], bound);

      expect(timeout.mock.calls).toEqual([[bound]]);
    },
  );

  it.each([
    [
      "times out",
      async (): Promise<Response> => {
        throw new DOMException("The operation timed out", "TimeoutError");
      },
    ],
    [
      "cannot be reached",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "fails",
      async (): Promise<Response> => new Response(null, { status: 500 }),
    ],
  ])(
    "answers an incomplete lookup when Scryfall %s, remembers nothing, and asks again next time",
    async (_, answer) => {
      const fetchMock = scryfall(answer);

      const first = await findArt(["Guttersnipe"], BOUND);
      await findArt(["Guttersnipe"], BOUND);

      expect(first).toEqual({ art: new Map(), complete: false });
      expect(scryfallNames(fetchMock)).toEqual([
        ["Guttersnipe"],
        ["Guttersnipe"],
      ]);
    },
  );

  it.each([429, 500])(
    "cancels the body of a %i from Scryfall, so the connection is freed",
    async (status) => {
      const cancel = vi.fn();
      scryfall(
        async () => new Response(new ReadableStream({ cancel }), { status }),
      );

      await findArt(["Guttersnipe"], BOUND);

      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["no data", {}],
    ["data that is not a list", { data: null }],
    ["a card that is not an object", { data: [null] }],
    ["a name that is not a string", { data: [{ name: 5 }] }],
    [
      "faces that are not a list",
      { data: [{ name: "Guttersnipe", card_faces: {} }] },
    ],
    ["no faces", { data: [{ name: "Guttersnipe", card_faces: null }] }],
    [
      "images that are not an object",
      { data: [{ name: "Guttersnipe", image_uris: "guttersnipe.jpg" }] },
    ],
    [
      "an art crop that is not a string",
      { data: [{ name: "Guttersnipe", image_uris: { art_crop: 5 } }] },
    ],
  ])(
    "treats a 200 with %s as a failed lookup that remembers nothing",
    async (_, payload) => {
      const fetchMock = scryfall(async () => Response.json(payload));

      const first = await findArt(["Guttersnipe"], BOUND);
      await findArt(["Guttersnipe"], BOUND);

      expect(first).toEqual({ art: new Map(), complete: false });
      expect(scryfallNames(fetchMock)).toEqual([
        ["Guttersnipe"],
        ["Guttersnipe"],
      ]);
    },
  );

  it("sends Scryfall nothing for 30 seconds after a 429, and keeps the art it already has", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const first = scryfall(
      collection([card("Reckoner's Bargain", BARGAIN_ART)]),
    );
    await findArt(["Reckoner's Bargain"], BOUND);

    const limited = scryfall(async () => new Response(null, { status: 429 }));
    const rateLimited = await findArt(
      ["Reckoner's Bargain", "Guttersnipe"],
      BOUND,
    );
    vi.advanceTimersByTime(29_999);
    const paused = await findArt(["Reckoner's Bargain", "Guttersnipe"], BOUND);
    vi.advanceTimersByTime(1);
    await findArt(["Reckoner's Bargain", "Guttersnipe"], BOUND);

    expect(scryfallNames(first)).toEqual([["Reckoner's Bargain"]]);
    expect(rateLimited.complete).toBe(false);
    expect(paused.complete).toBe(false);
    expect(Object.fromEntries(paused.art)).toEqual({
      "Reckoner's Bargain": BARGAIN_ART,
    });
    expect(scryfallNames(limited)).toEqual([["Guttersnipe"], ["Guttersnipe"]]);
  });
});
