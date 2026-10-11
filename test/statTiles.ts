import { screen } from "@testing-library/react";

/**
 * Reads the stat tiles on the screen, each as its label and its values.
 *
 * @returns One line per tile, such as `Players: 2,172` or `Match win rate: 52.0% / 51.3% to 52.8%`.
 */
export function statTiles(): string[] {
  return screen.getAllByRole("term").map((term) => {
    const values = [...(term.parentElement?.querySelectorAll("dd") ?? [])];

    return `${term.textContent}: ${values.map((value) => value.textContent).join(" / ")}`;
  });
}
