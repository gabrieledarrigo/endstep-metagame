import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchupSwatch } from "./MatchupSwatch";

describe("MatchupSwatch", () => {
  it("shows its text in the colour of its state", () => {
    render(<MatchupSwatch state="win">57</MatchupSwatch>);

    expect(screen.getByText("57").className).toBe(
      "matchup-swatch matchup-swatch--win",
    );
  });

  it("is read by assistive technology unless hidden", () => {
    const { container } = render(
      <>
        <MatchupSwatch state="loss">38</MatchupSwatch>
        <MatchupSwatch state="none" hidden>
          ·
        </MatchupSwatch>
      </>,
    );

    expect(container.textContent).toBe("38·");
    expect(screen.getByText("38").getAttribute("aria-hidden")).toBeNull();
    expect(screen.getByText("·").getAttribute("aria-hidden")).toBe("true");
  });
});
