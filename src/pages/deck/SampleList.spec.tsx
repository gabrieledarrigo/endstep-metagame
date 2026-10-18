import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import sampleCards from "../../../test/fixtures/sample-cards.json";
import { stubWidth } from "../../../test/stubWidth";
import type {
  DeckDetail,
  SampleCardsResponse,
  SampleList as SampleListData,
} from "../../api/types";
import { SampleList } from "./SampleList";

const LIST = (detail as DeckDetail).sampleList;

const TEXT = `4 Drossforge Bridge
4 Galvanic Blast
4 Ichor Wellspring
4 Mistvault Bridge
4 Myr Enforcer
4 Reckoner's Bargain
4 Refurbished Familiar
4 Thoughtcast
4 Vault of Whispers
3 Black Mage's Rod
3 Krark-Clan Shaman
3 Utrom Monitor
2 Blood Fountain
2 Great Furnace
2 Nihil Spellbomb
2 Seat of the Synod
2 Silverbluff Bridge
2 Toxin Analysis
1 Makeshift Munitions
1 Mountain
1 Sewer-veillance Cam`;

const SIDE = `4 Hydroblast
4 Pyroblast
2 Blue Elemental Blast
2 Extract a Confession
1 Krark-Clan Shaman
1 Red Elemental Blast
1 Unexpected Fangs`;

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SampleList", () => {
  it("says where the list comes from, and lists the main deck and the sideboard by count, then name", () => {
    render(<SampleList list={LIST} />);

    expect(
      screen.getByText(
        "260 players brought this exact list. It is 42% like the deck's average list, and the most common of 3,204 distinct lists.",
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual(["Main deck 60", "Sideboard 15"]);
    const [main] = screen.getAllByRole("list");
    expect(
      within(main)
        .getAllByRole("listitem")
        .slice(0, 3)
        .map((item) => item.textContent),
    ).toEqual(["4Drossforge Bridge", "4Galvanic Blast", "4Ichor Wellspring"]);
  });

  it("copies the list in the format MTGO imports, with a blank line before the sideboard", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    stubClipboard(writeText);
    render(<SampleList list={LIST} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    });

    expect(writeText).toHaveBeenCalledWith(`${TEXT}\n\n${SIDE}`);
    expect(screen.getByRole("status").textContent).toBe("Copied the list.");
  });

  it("shows the same text, selected, when the clipboard is refused", async () => {
    stubClipboard(async () => {
      throw new Error("NotAllowedError");
    });
    render(<SampleList list={LIST} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    });

    expect(screen.getByRole("status").textContent).toBe(
      "The clipboard is not available. The list is selected below, ready to copy.",
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "Sample list as text",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe(`${TEXT}\n\n${SIDE}`);
  });

  it("clears the status before each copy, so a second copy is announced too, and hides the text box after a success", async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("NotAllowedError"))
      .mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<SampleList list={LIST} />);
    const button = screen.getByRole("button", { name: "Copy list" });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole("textbox")).toBeTruthy();

    const statuses: string[] = [];
    const observer = new MutationObserver(() => {
      statuses.push(screen.getByRole("status").textContent ?? "");
    });
    observer.observe(screen.getByRole("status"), {
      childList: true,
      characterData: true,
      subtree: true,
    });
    await act(async () => {
      fireEvent.click(button);
    });
    await act(async () => {
      fireEvent.click(button);
    });
    observer.disconnect();

    expect(statuses).toEqual(["", "Copied the list.", "", "Copied the list."]);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("shows the main deck only, and copies it, when the sideboard is held back", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    stubClipboard(writeText);
    const mainOnly: SampleListData = {
      ...LIST,
      state: "mainOnly",
      reason: "sideboard_below_player_floor",
      players: 5,
    };
    render(<SampleList list={mainOnly} />);

    expect(
      screen.getByText("5 players brought this exact main deck."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Not shown. Fewer than 3 players brought this exact 75.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Hydroblast")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy main deck" }));
    });

    expect(writeText).toHaveBeenCalledWith(TEXT);
  });

  it("leaves out the sideboard heading and the blank line when the sideboard is empty", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    stubClipboard(writeText);
    render(<SampleList list={{ ...LIST, side: [] }} />);

    expect(screen.queryByRole("heading", { name: /Sideboard/ })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    });

    expect(writeText).toHaveBeenCalledWith(TEXT);
  });

  it.each([
    [
      "main_below_player_floor",
      "No list to show. No main deck was brought by 3 or more players in this window.",
    ],
    [
      "no_registrations",
      "No list to show. No list was registered for this deck in this window.",
    ],
  ] as const)(
    "shows a note and no list when it is held back for %s",
    (reason, note) => {
      render(<SampleList list={{ ...LIST, state: "withheld", reason }} />);

      expect(screen.getByText(note)).toBeTruthy();
      expect(screen.queryByRole("list")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    },
  );

  describe("cost to build", () => {
    it("follows the lists once the cards arrive", () => {
      render(<SampleList list={LIST} cards={sampleCards.cards} />);

      const cost = screen.getByRole("region", { name: "Cost to build" });
      expect(
        screen
          .getAllByRole("heading")
          .map((heading) => heading.textContent)
          .at(-1),
      ).toBe("Cost to build");
      expect(
        within(cost).getByText("Main deck 76.87 tix · Sideboard 154.86 tix"),
      ).toBeTruthy();
    });

    it("is absent while the cards have not arrived or have failed", () => {
      render(<SampleList list={LIST} />);

      expect(
        screen.queryByRole("region", { name: "Cost to build" }),
      ).toBeNull();
    });

    it("is hidden while the cards belong to a list no longer on screen", () => {
      render(<SampleList list={LIST} cards={sampleCards.cards} cardsPending />);

      expect(
        screen.queryByRole("region", { name: "Cost to build" }),
      ).toBeNull();
    });

    it("prices a main deck shown alone as the main deck", () => {
      const mainOnly: SampleListData = {
        ...LIST,
        state: "mainOnly",
        reason: "sideboard_below_player_floor",
      };

      render(<SampleList list={mainOnly} cards={sampleCards.cards} />);

      expect(screen.getByText("Main deck 76.87 tix")).toBeTruthy();
      expect(screen.getByText("No price for 1 card.")).toBeTruthy();
    });

    it("is absent for a withheld list", () => {
      const withheld: SampleListData = {
        ...LIST,
        state: "withheld",
        reason: "no_registrations",
        main: [],
        side: [],
      };

      render(<SampleList list={withheld} cards={{}} />);

      expect(
        screen.queryByRole("region", { name: "Cost to build" }),
      ).toBeNull();
    });
  });
});

describe("SampleList card previews", () => {
  const CARDS = (sampleCards as SampleCardsResponse).cards;

  function name(card: string, index = 0): HTMLElement {
    return screen.getAllByRole("button", { name: card })[index];
  }

  function previews(): HTMLElement[] {
    return screen.queryAllByRole("presentation", { hidden: true });
  }

  function focusVisibly(button: HTMLElement, visible: boolean): void {
    const matches = button.matches.bind(button);
    vi.spyOn(button, "matches").mockImplementation((selector) =>
      selector === ":focus-visible" ? visible : matches(selector),
    );
    act(() => {
      button.focus();
    });
  }

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 920, y: 300, width: 300, height: 20 }),
    );
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      1280,
    );
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
      800,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes a name a button only when its image came back", () => {
    render(<SampleList list={LIST} cards={CARDS} />);

    expect(name("Galvanic Blast").getAttribute("aria-haspopup")).toBe("dialog");
    expect(
      screen.getAllByRole("button", { name: "Krark-Clan Shaman" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Blue Elemental Blast" }),
    ).toBeNull();
    expect(screen.getByText("Blue Elemental Blast")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Vault of Whispers" }),
    ).toBeNull();
    expect(screen.getByText("Vault of Whispers")).toBeTruthy();
  });

  it("keeps every name plain without the cards", () => {
    render(<SampleList list={LIST} />);

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Copy list"]);
    expect(screen.getByText("Galvanic Blast")).toBeTruthy();
  });

  it("shows the card while a mouse points at its name, on a device that can hover", () => {
    stubWidth(1280, { hover: true });
    render(<SampleList list={LIST} cards={CARDS} />);

    fireEvent.pointerOver(name("Galvanic Blast"), { pointerType: "mouse" });

    expect(previews().map((image) => image.getAttribute("src"))).toEqual([
      CARDS["Galvanic Blast"].imageUrl,
    ]);

    fireEvent.pointerOut(name("Galvanic Blast"), { pointerType: "mouse" });

    expect(previews()).toEqual([]);
  });

  it("shows no card for a touch, or on a device that cannot hover", () => {
    stubWidth(1280, { hover: true });
    const { unmount } = render(<SampleList list={LIST} cards={CARDS} />);

    fireEvent.pointerOver(name("Galvanic Blast"), { pointerType: "touch" });
    expect(previews()).toEqual([]);
    unmount();

    stubWidth(1280);
    render(<SampleList list={LIST} cards={CARDS} />);

    fireEvent.pointerOver(name("Galvanic Blast"), { pointerType: "mouse" });
    focusVisibly(name("Galvanic Blast"), true);
    expect(previews()).toEqual([]);
  });

  it("shows the card on keyboard focus only, and hides it when focus moves on or on Escape", () => {
    stubWidth(1280, { hover: true });
    render(<SampleList list={LIST} cards={CARDS} />);

    focusVisibly(name("Galvanic Blast"), false);
    expect(previews()).toEqual([]);

    focusVisibly(name("Thoughtcast"), true);
    expect(previews().map((image) => image.getAttribute("src"))).toEqual([
      CARDS.Thoughtcast.imageUrl,
    ]);

    act(() => {
      name("Thoughtcast").blur();
    });
    expect(previews()).toEqual([]);

    focusVisibly(name("Thoughtcast"), true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(previews()).toEqual([]);
  });

  it("opens the card in a dialog on activation, and returns focus to its name when it closes", () => {
    stubWidth(1280, { hover: true });
    render(<SampleList list={LIST} cards={CARDS} />);
    fireEvent.pointerOver(name("Galvanic Blast"), { pointerType: "mouse" });

    fireEvent.click(name("Galvanic Blast"));

    const dialog = screen.getByRole("dialog", { name: "Galvanic Blast" });
    expect(
      within(dialog).getByRole("img", { name: "Galvanic Blast" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Close" }),
    );
    expect(previews()).toEqual([]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(name("Galvanic Blast"));
  });

  it("returns focus to the very name it opened from, in the sideboard, on Escape", () => {
    render(<SampleList list={LIST} cards={CARDS} />);

    fireEvent.click(name("Krark-Clan Shaman", 1));
    act(() => {
      (screen.getByRole("dialog") as HTMLDialogElement).close();
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(name("Krark-Clan Shaman", 1));
  });

  it("does not show the card again when focus returns from the dialog", () => {
    stubWidth(1280, { hover: true });
    render(<SampleList list={LIST} cards={CARDS} />);
    const button = name("Galvanic Blast");
    const matches = button.matches.bind(button);
    vi.spyOn(button, "matches").mockImplementation((selector) =>
      selector === ":focus-visible" ? true : matches(selector),
    );

    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(document.activeElement).toBe(button);
    expect(previews()).toEqual([]);
  });

  it("closes the dialog on a tap outside the card, and not on the card", () => {
    render(<SampleList list={LIST} cards={CARDS} />);
    fireEvent.click(name("Utrom Monitor"));
    const dialog = screen.getByRole("dialog", { name: "Utrom Monitor" });

    fireEvent.click(within(dialog).getByRole("img", { name: "Utrom Monitor" }));
    expect(screen.getByRole("dialog")).toBe(dialog);

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(name("Utrom Monitor"));
  });
});
