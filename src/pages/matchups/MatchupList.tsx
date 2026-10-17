import type {
  MatchupCell,
  MatchupMatrix,
  MatrixDeck,
  TimeWindow,
} from "../../api/types";
import { MatchupSwatch } from "../../components/MatchupSwatch";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import {
  type CellState,
  cellOf,
  cellState,
  cellText,
  formatCount,
  neededText,
} from "../../helpers";
import "./MatchupList.css";

const VERDICT: Record<CellState, string> = {
  win: "Favoured",
  loss: "Unfavoured",
  neutral: "Within chance",
  gated: "Too few to call",
  none: "No data",
  mirror: "Mirror",
};

function matchesText(cell: MatchupCell | undefined): string | null {
  if (cell === undefined) {
    return null;
  }

  if (cell.gate !== null) {
    return neededText(cell.wins + cell.losses, "matches");
  }

  return `${formatCount(cell.matches)} ${cell.matches === 1 ? "match" : "matches"}`;
}

type MatchupListProps = {
  matrix: MatchupMatrix;
  deck: MatrixDeck;
  timeWindow?: TimeWindow;
  notice?: string;
};

export function MatchupList({
  matrix,
  deck,
  timeWindow,
  notice,
}: MatchupListProps) {
  const { decks, cells } = matrix;
  const others = decks.filter((item) => item.slug !== deck.slug);
  const scope = timeWindow ? `, ${timeWindow} window` : "";

  return (
    <div className="matchup-list">
      {notice !== undefined && <p className="matchup-list__notice">{notice}</p>}
      <ol
        className="matchup-list__items"
        aria-label={`Match win rate of ${deck.name} against the other ${others.length} decks in the top ${decks.length}${scope}, rated.`}
      >
        {others.map((opponent) => {
          const state = cellState(cells, deck.slug, opponent.slug);
          const cell = cellOf(cells, deck.slug, opponent.slug);
          const matches = matchesText(cell);

          return (
            <li key={opponent.slug} className="matchup-list__item">
              <span className="matchup-list__name">
                <WindowLink
                  className="matchup-list__link"
                  to={`/decks/${opponent.slug}`}
                >
                  {opponent.name}
                </WindowLink>
                {matches !== null && (
                  <span className="matchup-list__matches">{matches}</span>
                )}
              </span>
              <span className="matchup-list__verdict">{VERDICT[state]}</span>
              <MatchupSwatch state={state} hidden={state === "none"}>
                {cellText(state, cell)}
                {cell !== undefined && cell.rate !== null && (
                  <span className="visually-hidden">%</span>
                )}
              </MatchupSwatch>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MatchupListSkeleton() {
  return (
    <div className="matchup-list" aria-busy="true">
      <Skeleton className="matchup-list__skeleton" />
    </div>
  );
}
