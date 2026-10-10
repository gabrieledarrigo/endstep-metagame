import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColourPips } from "./ColourPips";

describe("ColourPips", () => {
  it("names the colours for a screen reader, in order", () => {
    render(<ColourPips colours={["W", "U", "B"]} />);

    expect(screen.getByText("Colours: white, blue, black")).toBeTruthy();
  });

  it("leaves out unknown letters", () => {
    render(<ColourPips colours={["R", "X"]} />);

    expect(screen.getByText("Colours: red")).toBeTruthy();
  });

  it("shows colourless when no letter is known", () => {
    render(<ColourPips colours={[]} />);

    expect(screen.getByText("Colours: colourless")).toBeTruthy();
  });
});
