import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Button, ButtonLink } from "./Button";

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

describe("ButtonLink", () => {
  it("is a link in a button's style, primary by default", () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/">Back to the overview</ButtonLink>
        <ButtonLink
          variant="secondary"
          to="https://endstep.cc/metagame/Pauper/affinity-e93f5f74"
          target="_blank"
        >
          View on endstep.cc
        </ButtonLink>
      </MemoryRouter>,
    );

    const back = screen.getByRole("link", { name: "Back to the overview" });
    expect(back.getAttribute("href")).toBe("/");
    expect(back.className).toBe("button button--primary button--link");
    const out = screen.getByRole("link", { name: "View on endstep.cc" });
    expect(out.getAttribute("href")).toBe(
      "https://endstep.cc/metagame/Pauper/affinity-e93f5f74",
    );
    expect(out.getAttribute("target")).toBe("_blank");
    expect(out.className).toBe("button button--secondary button--link");
  });
});
