import { useQuery } from "@tanstack/react-query";
import { fetchDecks, fetchSeries } from "../../api/endpoints";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckGrid, DeckGridSkeleton } from "./DeckGrid";
import { DeckTable, DeckTableSkeleton } from "./DeckTable";
import { EmptyWindow } from "./EmptyWindow";
import { RankedBars, RankedBarsSkeleton } from "./RankedBars";
import { ShareOverTime, ShareOverTimeSkeleton } from "./ShareOverTime";
import { Summary, SummarySkeleton } from "./Summary";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

export function OverviewPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const decks = useQuery({
    queryKey: ["decks", timeWindow],
    queryFn: ({ signal }) => fetchDecks(timeWindow, signal),
  });
  const series = useQuery({
    queryKey: ["series", timeWindow],
    queryFn: ({ signal }) => fetchSeries(timeWindow, signal),
  });

  const loading = decks.isPending || series.isPending;

  return (
    <>
      <PageTitle title="Overview" />

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
      </div>

      <p className="visually-hidden" role="status">
        {loading ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <Section
        query={decks}
        skeleton={<SummarySkeleton />}
        title="The summary could not be loaded"
      >
        {(data) => <Summary decks={data} />}
      </Section>

      <Section
        query={decks}
        skeleton={<DeckGridSkeleton />}
        title="The deck grid could not be loaded"
      >
        {(data) =>
          data.decks.items.length === 0 ? (
            <EmptyWindow timeWindow={timeWindow} onSelect={selectTimeWindow} />
          ) : (
            <DeckGrid decks={data.decks.items} />
          )
        }
      </Section>

      <Section
        query={decks}
        skeleton={<DeckTableSkeleton />}
        title="The deck table could not be loaded"
      >
        {(data) => <DeckTable decks={data.decks.items} />}
      </Section>

      <Section
        query={series}
        skeleton={<ShareOverTimeSkeleton />}
        title="Share over time could not be loaded"
      >
        {(data) => <ShareOverTime series={data.series} />}
      </Section>

      <Section
        query={decks}
        skeleton={<RankedBarsSkeleton />}
        title="Meta share by deck could not be loaded"
      >
        {(data) => <RankedBars decks={data.decks} />}
      </Section>

      <Section
        query={decks}
        skeleton={<WinRateScatterSkeleton />}
        title="Win rate against share could not be loaded"
      >
        {(data) => <WinRateScatter decks={data.decks.items} />}
      </Section>
    </>
  );
}
