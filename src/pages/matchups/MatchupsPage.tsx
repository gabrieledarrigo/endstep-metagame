import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { formatWindow } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

export function MatchupsPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const matchups = useMatchups(timeWindow);
  const loadingWindow = matchups.isPlaceholderData;
  const loading = matchups.isPending || loadingWindow;

  return (
    <>
      <PageTitle title="Matchups" />

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
        {matchups.data && !loadingWindow && (
          <span className="page__dates">
            {formatWindow(matchups.data.window)}
          </span>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {loading ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <div
        className={loadingWindow ? "page__body busy" : "page__body"}
        aria-busy={loadingWindow || undefined}
      >
        <Section
          query={matchups}
          skeleton={<MatchupTableSkeleton />}
          title="The matchup table could not be loaded"
        >
          {(data) =>
            data.decks.length > 0 ? (
              <MatchupTable
                key={data.decks.map((deck) => deck.slug).join(" ")}
                matrix={data}
                timeWindow={loadingWindow ? undefined : timeWindow}
              />
            ) : (
              <EmptyWindow
                timeWindow={timeWindow}
                onSelect={selectTimeWindow}
              />
            )
          }
        </Section>
      </div>
    </>
  );
}
