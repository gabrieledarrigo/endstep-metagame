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

type DeckMatchupsProps = {
  deck: Deck;
  detailWindow: { from: string; to: string };
  timeWindow: TimeWindow;
};

export function DeckMatchups({
  deck,
  detailWindow,
  timeWindow,
}: DeckMatchupsProps) {
  const matchups = useMatchups(timeWindow);
  const matrix = matchups.data;
  const row = matrix?.decks.find((item) => item.id === deck.id);
  const others = matrix?.decks.filter((item) => item.id !== deck.id) ?? [];
  const otherDates =
    matrix !== undefined &&
    (matrix.window.from !== detailWindow.from ||
      matrix.window.to !== detailWindow.to);

  return (
    <DeckSection
      className="deck-matchups"
      title={`Matchups against the top ${matrix?.decks.length ?? 24}`}
      note={
        row
          ? `Match win rate against each of the other ${others.length} decks in the top ${matrix?.decks.length}, in share order. Read across.`
          : undefined
      }
    >
      {otherDates && matrix && (
        <p className="deck-matchups__dates">
          These matchups cover {formatWindow(matrix.window)}.
        </p>
      )}
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
                label={`Match win rate of ${row.name} against the other ${others.length} decks in the top ${data.decks.length}, ${timeWindow} window, rated.`}
                linkRows={false}
              />
              <MatchupLegend mirror={false} />
            </>
          ) : (
            <Panel>
              <p className="deck-matchups__outside">
                {deck.name} is not in the top {data.decks.length} for this
                window, so it has no row in the matchup table.{" "}
                <WindowLink to="/matchups">See the matchup table</WindowLink>
              </p>
            </Panel>
          )
        }
      </Section>
    </DeckSection>
  );
}
