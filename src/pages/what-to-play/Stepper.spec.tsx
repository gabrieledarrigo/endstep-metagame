import { fireEvent, render, screen } from "@testing-library/react";
import { type Mock, describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

function renderStepper(
  canLower: boolean,
  canRaise: boolean,
): { onLower: Mock; onRaise: Mock } {
  const onLower = vi.fn();
  const onRaise = vi.fn();

  render(
    <Stepper
      name="Affinity"
      value="9.4%"
      canLower={canLower}
      canRaise={canRaise}
      onLower={onLower}
      onRaise={onRaise}
    />,
  );

  return { onLower, onRaise };
}

describe("Stepper", () => {
  it("names its buttons after the deck, and describes both with the share", () => {
    renderStepper(true, true);

    const less = screen.getByRole("button", { name: "Less Affinity" });
    const more = screen.getByRole("button", { name: "More Affinity" });

    expect(screen.getByText("9.4%")).toBeTruthy();
    expect(less.getAttribute("aria-describedby")).toBe(
      screen.getByText("9.4%").id,
    );
    expect(more.getAttribute("aria-describedby")).toBe(
      screen.getByText("9.4%").id,
    );
  });

  it("lowers and raises on a press", () => {
    const { onLower, onRaise } = renderStepper(true, true);

    fireEvent.click(screen.getByRole("button", { name: "Less Affinity" }));
    fireEvent.click(screen.getByRole("button", { name: "More Affinity" }));

    expect(onLower).toHaveBeenCalledTimes(1);
    expect(onRaise).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole("button", { name: "Less Affinity" })
        .hasAttribute("aria-disabled"),
    ).toBe(false);
  });

  it("marks a button that cannot act with aria-disabled, keeps it focusable and ignores its presses", () => {
    const { onLower, onRaise } = renderStepper(false, false);
    const less = screen.getByRole("button", { name: "Less Affinity" });
    const more = screen.getByRole("button", { name: "More Affinity" });

    less.focus();
    fireEvent.click(less);
    fireEvent.click(more);

    expect(less.getAttribute("aria-disabled")).toBe("true");
    expect(more.getAttribute("aria-disabled")).toBe("true");
    expect(less.hasAttribute("disabled")).toBe(false);
    expect(document.activeElement).toBe(less);
    expect(onLower).not.toHaveBeenCalled();
    expect(onRaise).not.toHaveBeenCalled();
  });
});
