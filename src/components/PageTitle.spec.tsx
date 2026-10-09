import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "./PageTitle";

describe("PageTitle", () => {
  it("names the page in the main heading and in the document title", () => {
    render(<PageTitle title="Overview" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeTruthy();
    expect(document.title).toBe("Overview · Pauper Endstep metagame");
  });

  it("keeps the title for screen readers while a placeholder bar stands in for it", () => {
    render(<PageTitle title="Loading the deck" loading />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Loading the deck",
    });
    expect(heading.textContent).toBe("Loading the deck");
    expect(heading.querySelector(".skeleton")).toBeTruthy();
  });
});
