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

  it("adds a detail line, and marks a gated value", () => {
    render(
      <dl>
        <StatTile
          hero
          gated
          label="Match win rate"
          value="Too few to call"
          detail="12 of the 20 matches needed"
        />
      </dl>,
    );

    const [value, detail] = screen.getAllByRole("definition");
    expect(value.textContent).toBe("Too few to call");
    expect(value.className).toBe("stat-tile__value stat-tile__value--gated");
    expect(detail.textContent).toBe("12 of the 20 matches needed");
  });
});
