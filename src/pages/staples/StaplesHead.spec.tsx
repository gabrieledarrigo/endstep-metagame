import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaplesHead } from "./StaplesHead";

describe("StaplesHead", () => {
  it("names the page in its heading and its document title", () => {
    render(<StaplesHead />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Staples" }),
    ).toBeTruthy();
    expect(document.title).toBe("Staples · Pauper Endstep metagame");
  });

  it("says what the page shows under the heading", () => {
    render(<StaplesHead />);

    const line = screen.getByText("The cards the top 24 decks play most.");
    expect(line.previousElementSibling).toBe(
      screen.getByRole("heading", { level: 1, name: "Staples" }),
    );
  });

  it("carries its block on its root", () => {
    const { container } = render(<StaplesHead />);

    expect(container.firstElementChild?.className).toBe("staples-head");
  });
});
