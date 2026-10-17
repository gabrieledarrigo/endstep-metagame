import type { Deck, TimeWindow } from "../../api/types";
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
  const row = matrix?.decks.find((item) => item.id === deck.id);
  const others = matrix?.decks.filter((item) => item.id !== deck.id) ?? [];
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
        aria-busy={loading || undefined}
      >
        <Section
          query={matchups}
          skeleton={<Skeleton className="deck-matchups__skeleton" />}
          title="The matchups could not be loaded"
        >
          {(data) =>
            row ? (
              <>
                <MatchupGrid
                  key={others.map((item) => item.slug).join(" ")}
                  rows={[row]}
                  columns={others}
                  cells={data.cells}
                  label={`Match win rate of ${row.name} against the other ${others.length} decks in the top ${data.decks.length}${loading ? "" : `, ${timeWindow} window`}, rated.`}
                  linkRows={false}
                  contained
                />
                <MatchupLegend mirror={false} />
              </>
            ) : data.decks.length > 0 ? (
              <Panel>
                <p className="deck-matchups__outside">
                  {deck.name} is not in the top {data.decks.length} for this
                  window, so it has no row in the matchup table.{" "}
                  <WindowLink to="/matchups">See the matchup table</WindowLink>
                </p>
              </Panel>
            ) : loading ? (
              <Skeleton className="deck-matchups__skeleton" />
            ) : (
              <Panel>
                <p className="deck-matchups__outside">
                  No matchups are recorded for this window yet.
                </p>
              </Panel>
            )
          }
        </Section>
      </div>
    </DeckSection>
  );
}
