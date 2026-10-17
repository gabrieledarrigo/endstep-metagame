import type { ReactNode } from "react";
import type { CellState } from "../helpers";
import "./MatchupSwatch.css";

type MatchupSwatchProps = {
  state: CellState;
  hidden?: boolean;
  children: ReactNode;
};

export function MatchupSwatch({ state, hidden, children }: MatchupSwatchProps) {
  return (
    <span
      className={`matchup-swatch matchup-swatch--${state}`}
      aria-hidden={hidden || undefined}
    >
      {children}
    </span>
  );
}
