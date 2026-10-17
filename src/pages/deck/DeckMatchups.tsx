import type { Deck, MatchupMatrix, TimeWindow } from "../../api/types";
import { MatchupGrid } from "../../components/MatchupGrid";
import { MatchupLegend } from "../../components/MatchupLegend";
import { Panel } from "../../components/Panel";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { formatWindow } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { DeckSection } from "./DeckSection";
import "./DeckMatchups.css";

const TOP = 24;

type MatchupRowProps = {
  deck: Deck;
  matrix: MatchupMatrix;
  loading: boolean;
  timeWindow: TimeWindow;
};

function MatchupRow({ deck, matrix, loading, timeWindow }: MatchupRowProps) {
  const row = matrix.decks.find((item) => item.id === deck.id);

  if (row) {
    const others = matrix.decks.filter((item) => item.id !== deck.id);
    const scope = loading ? "" : `, ${timeWindow} window`;

    return (
      <>
        <MatchupGrid
          key={others.map((item) => item.slug).join(" ")}
          rows={[row]}
          columns={others}
          cells={matrix.cells}
          label={`Match win rate of ${row.name} against the other ${others.length} decks in the top ${matrix.decks.length}${scope}, rated.`}
          linkRows={false}
          contained
        />
        <MatchupLegend mirror={false} />
      </>
    );
  }

  if (loading) {
    return <Skeleton className="deck-matchups__skeleton" />;
  }

  if (matrix.decks.length > 0) {
    return (
      <Panel>
        <p className="deck-matchups__outside">
          {deck.name} is not in the top {matrix.decks.length} for this window,
          so it has no row in the matchup table.{" "}
          <WindowLink to="/matchups">See the matchup table</WindowLink>
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <p className="deck-matchups__outside">
        No matchups are recorded for this window yet.
      </p>
    </Panel>
  );
}

type DeckMatchupsProps = {
  deck: Deck;
  detailWindow: { from: string; to: string };
  detailLoading: boolean;
  timeWindow: TimeWindow;
};

export function DeckMatchups({
  deck,
  detailWindow,
  detailLoading,
  timeWindow,
}: DeckMatchupsProps) {
  const matchups = useMatchups(timeWindow);
  const matrix = matchups.data;
  const loading = matchups.isPlaceholderData;
  const otherDates =
    matrix !== undefined &&
    !loading &&
    !detailLoading &&
    (matrix.window.from !== detailWindow.from ||
      matrix.window.to !== detailWindow.to);

  return (
    <DeckSection
      className="deck-matchups"
      title={`Matchups against the top ${matrix?.decks.length || TOP}`}
    >
      {otherDates && matrix && (
        <p className="deck-matchups__dates">
          These matchups cover {formatWindow(matrix.window)}.
        </p>
      )}
      <div
        className={
          loading && !detailLoading
            ? "deck-matchups__body busy"
            : "deck-matchups__body"
        }
        aria-busy={loading || matchups.isPending || undefined}
      >
        <Section
          query={matchups}
          skeleton={<Skeleton className="deck-matchups__skeleton" />}
          title="The matchups could not be loaded"
        >
          {(data) => (
            <MatchupRow
              deck={deck}
              matrix={data}
              loading={loading}
              timeWindow={timeWindow}
            />
          )}
        </Section>
      </div>
    </DeckSection>
  );
}
