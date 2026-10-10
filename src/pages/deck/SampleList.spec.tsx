import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import detail from "../../../test/fixtures/deck.json";
import type { DeckDetail, SampleList as SampleListData } from "../../api/types";
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
});
