import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";
import { useHeadingFocus } from "./useHeadingFocus";

function Page({ state }: { state: string }) {
  useHeadingFocus(state);

  return (
    <>
      {state === "loading" && <button type="button">Leaves</button>}
      <button type="button">Elsewhere</button>
      {state === "loading" && (
        <div>
          <h1 tabIndex={-1}>Loading the deck</h1>
        </div>
      )}
      {state === "loaded" && (
        <section>
          <h1 tabIndex={-1}>Affinity</h1>
        </section>
      )}
    </>
  );
}

function Layout({ state }: { state: string }) {
  useLayoutEffect(() => {
    document.querySelector<HTMLElement>("h1")?.focus();
  }, []);

  return <Page state={state} />;
}

describe("useHeadingFocus", () => {
  it("moves focus to the new main heading when the focused one is replaced", () => {
    const { rerender } = render(<Page state="loading" />);
    act(() => {
      screen.getByRole("heading", { name: "Loading the deck" }).focus();
    });

    rerender(<Page state="loaded" />);

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Affinity" }),
    );
  });

  it("leaves focus alone when it was somewhere else", () => {
    const { rerender } = render(<Page state="loading" />);
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    act(() => {
      elsewhere.focus();
    });

    rerender(<Page state="loaded" />);

    expect(document.activeElement).toBe(elsewhere);
  });

  it("counts a heading a parent focused before the hook started listening", () => {
    const { rerender } = render(<Layout state="loading" />);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Loading the deck" }),
    );

    rerender(<Layout state="loaded" />);

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Affinity" }),
    );
  });

  it("does not take focus when something other than the heading lost it", () => {
    const { rerender } = render(<Page state="loading" />);
    act(() => {
      screen.getByRole("button", { name: "Leaves" }).focus();
    });

    rerender(<Page state="loaded" />);

    expect(document.activeElement).toBe(document.body);
  });

  it("leaves focus alone when the reader moved it off the heading onto the page", async () => {
    const { rerender } = render(<Page state="loading" />);
    const heading = screen.getByRole("heading", { name: "Loading the deck" });
    act(() => {
      heading.focus();
    });
    await act(async () => {
      heading.blur();
    });

    rerender(<Page state="loaded" />);

    expect(document.activeElement).toBe(document.body);
  });

  it("keeps counting a heading that was removed, even when the browser reports its removal as a focus loss", async () => {
    const { rerender } = render(<Page state="loading" />);
    const heading = screen.getByRole("heading", { name: "Loading the deck" });
    act(() => {
      heading.focus();
    });

    heading.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: null }),
    );
    act(() => {
      rerender(<Page state="between" />);
    });
    await act(async () => {});
    rerender(<Page state="loaded" />);

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Affinity" }),
    );
  });
});
