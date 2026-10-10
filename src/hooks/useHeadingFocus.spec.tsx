import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHeadingFocus } from "./useHeadingFocus";

function Page({ state }: { state: string }) {
  useHeadingFocus(state);

  return (
    <>
      <button type="button">Elsewhere</button>
      {state === "loading" ? (
        <div>
          <h1 tabIndex={-1}>Loading the deck</h1>
        </div>
      ) : (
        <section>
          <h1 tabIndex={-1}>Affinity</h1>
        </section>
      )}
    </>
  );
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
});
