import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatePanel } from "./StatePanel";

describe("StatePanel", () => {
  it("shows the title as a heading, with the detail and the action", () => {
    render(
      <StatePanel
        title="No decks in this window"
        detail="Try a longer window."
        action={<button type="button">Switch to season</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No decks in this window" }),
    ).toBeTruthy();
    expect(screen.getByText("Try a longer window.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Switch to season" }),
    ).toBeTruthy();
  });

  it("shows the title alone, and marks the panel while it is busy", () => {
    const { container } = render(<StatePanel title="Loading" busy />);

    expect(container.textContent).toBe("Loading");
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});
