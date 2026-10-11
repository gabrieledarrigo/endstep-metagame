import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatList } from "./StatList";
import { StatTile } from "./StatTile";

describe("StatList", () => {
  it("lists its tiles as terms and definitions", () => {
    const { container } = render(
      <StatList>
        <StatTile label="Players" value="8,355" />
        <StatTile label="Matches" value="25,892" />
      </StatList>,
    );

    expect(container.firstElementChild?.tagName).toBe("DL");
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      ["Players", "Matches"],
    );
  });

  it("takes the compact style", () => {
    const { container } = render(
      <StatList compact>
        <StatTile label="Players" value="8,355" />
      </StatList>,
    );

    expect(container.firstElementChild?.className).toBe(
      "stat-list stat-list--compact",
    );
  });
});
