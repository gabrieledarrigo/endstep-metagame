import type { CellState } from "../helpers";
import "./MatchupSwatch.css";

type MatchupSwatchProps = {
  state: CellState;
  text: string;
  hidden?: boolean;
};

export function MatchupSwatch({ state, text, hidden }: MatchupSwatchProps) {
  return (
    <span
      className={`matchup-swatch matchup-swatch--${state}`}
      aria-hidden={hidden || undefined}
    >
      {text}
    </span>
  );
}
