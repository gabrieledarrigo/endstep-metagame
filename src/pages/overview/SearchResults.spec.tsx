import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchResults } from "./SearchResults";

function decks(): ReactElement {
  return (
    <ul>
      <li>
        <a href="/decks/altar-tron-0b4d9ce7?window=30d">Altar Tron</a>
      </li>
      <li>
        <a href="/decks/gardens-4ad158da?window=30d">Gardens</a>
      </li>
    </ul>
  );
}

function fullText(
  text: string,
): (content: string, element: Element | null) => boolean {
  return (content, element) =>
    element?.tagName === "P" && element.textContent === text;
}

describe("SearchResults", () => {
  it("shows the field above the decks, with no result line while nothing is searched", () => {
    render(
      <SearchResults field={<input aria-label="Field" />}>
        {decks()}
      </SearchResults>,
    );

    expect(screen.getByRole("textbox", { name: "Field" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gardens" })).toBeTruthy();
    expect(screen.queryByText(/Search covers/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("counts the matches and names the term", () => {
    const { rerender } = render(
      <SearchResults field={null} found={{ term: "elf", total: 1234 }}>
        {decks()}
      </SearchResults>,
    );

    expect(
      screen.getByText(
        fullText(
          "1,234 decks match “elf”. Search covers deck names and every card in their lists.",
        ),
      ),
    ).toBeTruthy();

    rerender(
      <SearchResults field={null} found={{ term: "altar tron", total: 1 }}>
        {decks()}
      </SearchResults>,
    );

    expect(
      screen.getByText(
        fullText(
          "1 deck matches “altar tron”. Search covers deck names and every card in their lists.",
        ),
      ),
    ).toBeTruthy();
  });

  it("offers the next 24 results, or what is left when fewer remain", () => {
    const onMore = vi.fn();
    const { rerender } = render(
      <SearchResults
        field={null}
        more={{ remaining: 30, loading: false, onMore }}
      >
        {decks()}
      </SearchResults>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show 24 more" }));

    expect(onMore).toHaveBeenCalledTimes(1);

    rerender(
      <SearchResults
        field={null}
        more={{ remaining: 6, loading: false, onMore }}
      >
        {decks()}
      </SearchResults>,
    );

    expect(screen.getByRole("button", { name: "Show 6 more" })).toBeTruthy();
  });

  it("says when the next decks could not be loaded, and keeps the button as the retry", () => {
    const onMore = vi.fn();
    render(
      <SearchResults
        field={null}
        more={{ remaining: 6, loading: false, onMore }}
        moreError="The next decks could not be loaded. Endstep did not respond."
      >
        {decks()}
      </SearchResults>,
    );

    expect(
      screen.getByText(
        "The next decks could not be loaded. Endstep did not respond.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show 6 more" }));

    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("marks the button busy while the next page loads, and ignores a second click", () => {
    const onMore = vi.fn();
    render(
      <SearchResults
        field={null}
        more={{ remaining: 30, loading: true, onMore }}
      >
        {decks()}
      </SearchResults>,
    );
    const button = screen.getByRole("button", { name: "Show 24 more" });

    fireEvent.click(button);

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(onMore).not.toHaveBeenCalled();
  });

  it("marks the results busy, not the field", () => {
    render(
      <SearchResults field={<input aria-label="Field" />} busy>
        {decks()}
      </SearchResults>,
    );

    const results = screen
      .getByRole("link", { name: "Gardens" })
      .closest("[aria-busy]");

    expect(results?.getAttribute("aria-busy")).toBe("true");
    expect(
      screen.getByRole("textbox", { name: "Field" }).closest("[aria-busy]"),
    ).toBeNull();
  });

  it("moves focus to the deck it is given, and says so", () => {
    const onFocused = vi.fn();
    render(
      <SearchResults
        field={null}
        focus="gardens-4ad158da"
        onFocused={onFocused}
      >
        {decks()}
      </SearchResults>,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Gardens" }),
    );
    expect(onFocused).toHaveBeenCalledTimes(1);
  });

  it("waits for the deck to render before it moves focus", () => {
    const onFocused = vi.fn();
    const { rerender } = render(
      <SearchResults field={null} focus="ruby-storm-1" onFocused={onFocused}>
        {decks()}
      </SearchResults>,
    );

    expect(onFocused).not.toHaveBeenCalled();

    rerender(
      <SearchResults field={null} focus="ruby-storm-1" onFocused={onFocused}>
        <a href="/decks/ruby-storm-1?window=30d">Ruby Storm</a>
      </SearchResults>,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Ruby Storm" }),
    );
    expect(onFocused).toHaveBeenCalledTimes(1);
  });
});
