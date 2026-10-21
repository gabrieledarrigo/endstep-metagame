import { useTranslation } from "react-i18next";
import type { MatchupMatrix, TimeWindow } from "../../api/types";
import { MatchupGrid } from "../../components/MatchupGrid";
import { MatchupLegend } from "../../components/MatchupLegend";
import { Skeleton } from "../../components/Skeleton";
import "./MatchupTable.css";

type MatchupTableProps = {
  matrix: MatchupMatrix;
  timeWindow?: TimeWindow;
  spotlight?: string;
  reveal?: boolean;
  onReveal?: () => void;
  notice?: string;
};

export function MatchupTable({
  matrix,
  timeWindow,
  spotlight,
  reveal,
  onReveal,
  notice,
}: MatchupTableProps) {
  const { t } = useTranslation();
  const { decks, cells } = matrix;
  const label = timeWindow
    ? t("matchups.matchupTable.labelWindow", {
        top: decks.length,
        window: t(`common.window.${timeWindow}`),
      })
    : t("matchups.matchupTable.label", { top: decks.length });

  return (
    <div className="bleed matchup-table">
      <div className="matchup-table__inner">
        {notice !== undefined && (
          <p className="matchup-table__notice">{notice}</p>
        )}
        <MatchupGrid
          className="matchup-table__grid"
          rows={decks}
          columns={decks}
          cells={cells}
          label={label}
          spotlight={spotlight}
          reveal={reveal}
          onReveal={onReveal}
        />
        <MatchupLegend />
      </div>
    </div>
  );
}

export function MatchupTableSkeleton() {
  return (
    <div className="bleed matchup-table" aria-busy="true">
      <div className="matchup-table__inner">
        <Skeleton className="matchup-table__skeleton" />
        <MatchupLegend />
      </div>
    </div>
  );
}
