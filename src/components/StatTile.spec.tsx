import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("pairs a label with its value", () => {
    render(
      <dl>
        <StatTile label="Players" value="8,355" />
      </dl>,
    );

    expect(screen.getByRole("term").textContent).toBe("Players");
    expect(screen.getByRole("definition").textContent).toBe("8,355");
  });

  it("takes the hero style", () => {
    render(
      <dl>
        <StatTile hero label="Registrations" value="236,728" />
      </dl>,
    );

    expect(screen.getByRole("term").parentElement?.className).toBe(
      "stat-tile stat-tile--hero",
    );
  });
});
