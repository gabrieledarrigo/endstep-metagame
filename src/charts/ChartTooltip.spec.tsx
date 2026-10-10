import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartTooltip } from "./ChartTooltip";

describe("ChartTooltip", () => {
  it("shows the day, the title and a name and value for each row", () => {
    render(
      <ChartTooltip
        day="7 October 2026"
        title="Affinity"
        rows={[
          { key: "share", name: "Meta share", value: "9.56%" },
          { key: "players", name: "Players", value: "1,954" },
        ]}
      />,
    );

    expect(screen.getByText("7 October 2026")).toBeTruthy();
    expect(screen.getByText("Affinity")).toBeTruthy();
    expect(screen.getByText("Meta share")).toBeTruthy();
    expect(screen.getByText("9.56%")).toBeTruthy();
    expect(screen.getByText("Players")).toBeTruthy();
    expect(screen.getByText("1,954")).toBeTruthy();
  });

  it("leaves out the day and the title when they are not given", () => {
    const { container } = render(
      <ChartTooltip rows={[{ key: "a", name: "Affinity", value: "9.56%" }]} />,
    );

    expect(container.textContent).toBe("Affinity9.56%");
  });

  it("closes with the verdict when there is one", () => {
    render(
      <ChartTooltip
        rows={[]}
        verdict="Too few to call: 18 of the 20 matches needed."
      />,
    );

    expect(
      screen.getByText("Too few to call: 18 of the 20 matches needed."),
    ).toBeTruthy();
  });
});
