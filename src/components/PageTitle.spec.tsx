import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTitle } from "./PageTitle";

describe("PageTitle", () => {
  it("names the page and the site in the main heading", () => {
    render(<PageTitle title="Overview" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Overview Endstep Pauper metagame",
      }),
    ).toBeTruthy();
  });
});
