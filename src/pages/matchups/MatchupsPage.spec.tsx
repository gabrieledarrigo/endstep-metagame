import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchupsPage } from "./MatchupsPage";

describe("MatchupsPage", () => {
  it("names the page in its main heading", () => {
    render(<MatchupsPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Matchups Endstep Pauper metagame",
      }),
    ).toBeTruthy();
  });
});
