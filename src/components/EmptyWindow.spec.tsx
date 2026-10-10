import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TimeWindow } from "../api/types";
import { EmptyWindow } from "./EmptyWindow";

describe("EmptyWindow", () => {
  it("offers the next longer window", () => {
    const onSelect = vi.fn<(next: TimeWindow) => void>();
    render(<EmptyWindow timeWindow="1d" onSelect={onSelect} />);

    expect(
      screen.getByRole("heading", { name: "No decks in this window" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "The 1d window has no registrations yet. Try a longer window.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch to 7d" }));

    expect(onSelect).toHaveBeenCalledWith("7d");
  });

  it("offers nothing on the longest window", () => {
    render(<EmptyWindow timeWindow="season" onSelect={() => {}} />);

    expect(
      screen.getByText("The season window has no registrations yet."),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("takes its own title and detail", () => {
    render(
      <EmptyWindow
        timeWindow="1d"
        onSelect={() => {}}
        title="No matches in this window"
        detail="Affinity has no matches in the 1d window."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No matches in this window" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Affinity has no matches in the 1d window. Try a longer window.",
      ),
    ).toBeTruthy();
  });
});
