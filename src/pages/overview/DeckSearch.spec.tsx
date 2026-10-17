import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeckSearch } from "./DeckSearch";

function renderSearch(term: string | null = null): {
  onSearch: ReturnType<typeof vi.fn<(term: string | null) => void>>;
  rerender: (term: string | null) => void;
} {
  const onSearch = vi.fn<(term: string | null) => void>();
  const inputRef = createRef<HTMLInputElement>();
  const { rerender } = render(
    <DeckSearch term={term} onSearch={onSearch} inputRef={inputRef} />,
  );

  return {
    onSearch,
    rerender: (next) =>
      rerender(
        <DeckSearch term={next} onSearch={onSearch} inputRef={inputRef} />,
      ),
  };
}

function field(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>("searchbox", {
    name: "Search decks or cards",
  });
}

function type(text: string): void {
  fireEvent.change(field(), { target: { value: text } });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("DeckSearch", () => {
  it("is a search landmark with a labelled field and no clear button while empty", () => {
    renderSearch();

    expect(screen.getByRole("search")).toBeTruthy();
    expect(field().getAttribute("placeholder")).toBe("Search decks or cards");
    expect(field().value).toBe("");
    expect(screen.queryByRole("button", { name: "Clear the search" })).toBe(
      null,
    );
  });

  it("starts from the term in the address", () => {
    renderSearch("altar");

    expect(field().value).toBe("altar");
    expect(
      screen.getByRole("button", { name: "Clear the search" }),
    ).toBeTruthy();
  });

  it("sends the normalised term once, 300ms after the last keystroke", async () => {
    const { onSearch } = renderSearch();

    type("Al");
    await pause(150);
    type("  Altar   TRON ");
    await pause(200);

    expect(onSearch).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith("altar tron");
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("searches nothing for one character", async () => {
    const { onSearch } = renderSearch();

    type(" a ");
    await pause(400);

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("sends no term when the text drops below 2 characters", async () => {
    const { onSearch } = renderSearch("altar");

    type("a");

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(null);
    });
  });

  it("clears with its button at once, and keeps focus in the field", () => {
    const { onSearch } = renderSearch("altar");

    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));

    expect(onSearch).toHaveBeenCalledWith(null);
    expect(field().value).toBe("");
    expect(document.activeElement).toBe(field());
    expect(screen.queryByRole("button", { name: "Clear the search" })).toBe(
      null,
    );
  });

  it("clears with Escape at once, and keeps focus in the field", () => {
    const { onSearch } = renderSearch("altar");
    field().focus();

    fireEvent.keyDown(field(), { key: "Escape" });

    expect(onSearch).toHaveBeenCalledWith(null);
    expect(field().value).toBe("");
    expect(document.activeElement).toBe(field());
  });

  it("does nothing on Escape when the field is empty", () => {
    const { onSearch } = renderSearch();

    fireEvent.keyDown(field(), { key: "Escape" });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("follows a term that changes from outside", () => {
    const { rerender } = renderSearch("altar");

    rerender("elf");

    expect(field().value).toBe("elf");

    rerender(null);

    expect(field().value).toBe("");

    rerender("altar");

    expect(field().value).toBe("altar");
  });

  it("keeps text typed after a clear when the cleared term arrives late", () => {
    const { onSearch, rerender } = renderSearch("altar");

    fireEvent.keyDown(field(), { key: "Escape" });
    type("altar tron");
    rerender(null);

    expect(onSearch).toHaveBeenCalledWith(null);
    expect(field().value).toBe("altar tron");
  });

  it("keeps text typed after the last term it showed when another term arrives", () => {
    const { rerender } = renderSearch("xyzzy");

    type("elf");
    rerender(null);

    expect(field().value).toBe("elf");
  });

  it("keeps the same term retyped after a clear when the cleared term arrives late", () => {
    const { rerender } = renderSearch("altar");

    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    type("altar");
    rerender(null);

    expect(field().value).toBe("altar");
  });

  it("keeps the text as typed when the term it sent comes back", async () => {
    const { onSearch, rerender } = renderSearch();

    type("Altar ");
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith("altar");
    });
    rerender("altar");

    expect(field().value).toBe("Altar ");
  });

  it("keeps a single character when the term is removed", async () => {
    const { onSearch, rerender } = renderSearch("altar");

    type("a");
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(null);
    });
    rerender(null);

    expect(field().value).toBe("a");
  });
});
