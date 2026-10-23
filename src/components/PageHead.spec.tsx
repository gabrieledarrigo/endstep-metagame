import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHead } from "./PageHead";

const LINE = "The cards the top 24 decks play most.";

describe("PageHead", () => {
  it("names the page in its heading and its document title", () => {
    render(<PageHead title="Staples" line={LINE} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Staples" }),
    ).toBeTruthy();
    expect(document.title).toBe("Staples · Pauper Endstep metagame");
  });

  it("says what the page shows under the heading", () => {
    render(<PageHead title="Staples" line={LINE} />);

    expect(screen.getByText(LINE).previousElementSibling).toBe(
      screen.getByRole("heading", { level: 1, name: "Staples" }),
    );
  });

  it("carries its block on its root", () => {
    const { container } = render(<PageHead title="Staples" line={LINE} />);

    expect(container.firstElementChild?.className).toBe("page-head");
  });
});
