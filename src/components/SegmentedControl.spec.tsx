import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = ["7d", "30d", "season"] as const;

describe("SegmentedControl", () => {
  it("groups its options under the label and presses the current one", () => {
    render(
      <SegmentedControl
        label="Time window"
        options={OPTIONS}
        value="30d"
        onChange={() => {}}
      />,
    );

    const group = screen.getByRole("group", { name: "Time window" });
    expect(group.getAttribute("data-busy")).toBeNull();
    expect(
      screen
        .getAllByRole("button")
        .map((button) => [
          button.textContent,
          button.getAttribute("aria-pressed"),
        ]),
    ).toEqual([
      ["7d", "false"],
      ["30d", "true"],
      ["season", "false"],
    ]);
  });

  it("reports the chosen option", () => {
    const onChange = vi.fn<(option: string) => void>();
    render(
      <SegmentedControl
        label="Time window"
        options={OPTIONS}
        value="30d"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "season" }));

    expect(onChange).toHaveBeenCalledWith("season");
  });

  it("marks the group while it is busy", () => {
    render(
      <SegmentedControl
        label="Time window"
        options={OPTIONS}
        value="30d"
        onChange={() => {}}
        busy
      />,
    );

    expect(
      screen
        .getByRole("group", { name: "Time window" })
        .getAttribute("data-busy"),
    ).toBe("true");
  });
});
