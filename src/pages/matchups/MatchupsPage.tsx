import { useQuery } from "@tanstack/react-query";
import { fetchMatchups } from "../../api/endpoints";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { formatWindow } from "../../helpers";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

export function MatchupsPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const matchups = useQuery({
    queryKey: ["matchups", timeWindow],
    queryFn: ({ signal }) => fetchMatchups(timeWindow, signal),
    retry: false,
  });

  return (
    <>
      <PageTitle title="Matchups" />

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, matchups.isPending)}
          busy={matchups.isPending}
        />
        {matchups.data && (
          <span className="page__dates">
            {formatWindow(matchups.data.window)}
          </span>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {matchups.isPending ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <Section
        query={matchups}
        skeleton={<MatchupTableSkeleton />}
        title="The matchup table could not be loaded"
      >
        {(data) =>
          data.decks.length === 0 ? (
            <EmptyWindow timeWindow={timeWindow} onSelect={selectTimeWindow} />
          ) : (
            <MatchupTable
              key={data.decks.map((deck) => deck.slug).join(" ")}
              matrix={data}
              timeWindow={timeWindow}
            />
          )
        }
      </Section>
    </>
  );
}
