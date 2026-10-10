import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("is a plain button in the primary style by default", () => {
    render(<Button>Retry</Button>);

    const button = screen.getByRole("button", { name: "Retry" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe("button button--primary");
  });

  it("takes a variant, an extra class and the button's own attributes", () => {
    const onClick = vi.fn();
    render(
      <Button
        variant="secondary"
        className="extra"
        type="submit"
        onClick={onClick}
      >
        Switch to season
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Switch to season" });
    fireEvent.click(button);

    expect(button.className).toBe("button button--secondary extra");
    expect(button.getAttribute("type")).toBe("submit");
    expect(onClick).toHaveBeenCalledOnce();
  });
});
