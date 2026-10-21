import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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
  cellOf,
  cellState,
  cellText,
  formatCount,
  neededText,
} from "../../helpers";
import "./MatchupList.css";

function matchesText(
  t: TFunction,
  cell: MatchupCell | undefined,
): string | null {
  if (cell === undefined) {
    return null;
  }

  if (cell.gate !== null) {
    return neededText(cell.wins + cell.losses, "matches");
  }

  return t("matchups.matchupList.matches", {
    count: cell.matches,
    matches: formatCount(cell.matches),
  });
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
  const { t } = useTranslation();
  const { decks, cells } = matrix;
  const others = decks.filter((item) => item.slug !== deck.slug);
  const label = timeWindow
    ? t("matchups.matchupList.labelWindow", {
        deck: deck.name,
        count: others.length,
        top: decks.length,
        window: t(`common.window.${timeWindow}`),
      })
    : t("matchups.matchupList.label", {
        deck: deck.name,
        count: others.length,
        top: decks.length,
      });

  return (
    <div className="matchup-list">
      {notice !== undefined && <p className="matchup-list__notice">{notice}</p>}
      <ol className="matchup-list__items" aria-label={label}>
        {others.map((opponent) => {
          const state = cellState(cells, deck.slug, opponent.slug);
          const cell = cellOf(cells, deck.slug, opponent.slug);
          const matches = matchesText(t, cell);

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
              <span className="matchup-list__verdict">
                {t(`matchups.matchupList.verdict.${state}`)}
              </span>
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
