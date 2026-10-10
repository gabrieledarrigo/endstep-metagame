import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("wraps its children and passes its attributes on, with an extra class", () => {
    render(
      <Panel
        className="chart-section"
        aria-busy="true"
        role="region"
        aria-label="Chart"
      >
        <p>Content</p>
      </Panel>,
    );

    const panel = screen.getByRole("region", { name: "Chart" });
    expect(panel.className).toBe("panel chart-section");
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(panel.textContent).toBe("Content");
  });
});
