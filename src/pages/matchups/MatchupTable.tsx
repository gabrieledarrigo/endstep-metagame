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
  missing?: string;
};

export function MatchupTable({
  matrix,
  timeWindow,
  spotlight,
  reveal,
  onReveal,
  missing,
}: MatchupTableProps) {
  const { decks, cells } = matrix;
  const scope = timeWindow ? `, ${timeWindow} window` : "";

  return (
    <div className="bleed matchup-table">
      <div className="matchup-table__inner">
        {missing !== undefined && (
          <p className="matchup-table__notice" role="status">
            {missing} isn't in the top {decks.length} for the selected time
            window.
          </p>
        )}
        <MatchupGrid
          className="matchup-table__grid"
          rows={decks}
          columns={decks}
          cells={cells}
          label={`Match win rate of the row deck against the column deck. Top ${decks.length} decks by share${scope}, rated.`}
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
