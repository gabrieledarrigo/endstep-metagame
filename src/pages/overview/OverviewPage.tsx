import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDecks, fetchSeries } from "../../api/endpoints";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckGrid, DeckGridSkeleton } from "./DeckGrid";
import { DeckTable, DeckTableSkeleton } from "./DeckTable";
import { EmptyWindow } from "../../components/EmptyWindow";
import { RankedBars, RankedBarsSkeleton } from "./RankedBars";
import { ShareOverTime, ShareOverTimeSkeleton } from "./ShareOverTime";
import { Summary, SummarySkeleton } from "./Summary";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

export function OverviewPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const decks = useQuery({
    queryKey: ["decks", timeWindow],
    queryFn: ({ signal }) => fetchDecks(timeWindow, signal),
    placeholderData: keepPreviousData,
  });
  const series = useQuery({
    queryKey: ["series", timeWindow],
    queryFn: ({ signal }) => fetchSeries(timeWindow, signal),
    placeholderData: keepPreviousData,
  });

  const loadingWindow = decks.isPlaceholderData || series.isPlaceholderData;
  const loading = decks.isPending || series.isPending || loadingWindow;

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

      <div
        className={loadingWindow ? "page__body page__body--busy" : "page__body"}
        aria-busy={loadingWindow || undefined}
      >
        <Section
          query={decks}
          skeleton={<SummarySkeleton />}
          title="The summary could not be loaded"
        >
          {(data) => <Summary decks={data} loading={decks.isPlaceholderData} />}
        </Section>

        <Section
          query={decks}
          skeleton={<DeckGridSkeleton />}
          title="The deck grid could not be loaded"
        >
          {(data) =>
            data.decks.items.length > 0 ? (
              <DeckGrid decks={data.decks.items} />
            ) : decks.isPlaceholderData ? (
              <DeckGridSkeleton />
            ) : (
              <EmptyWindow
                timeWindow={timeWindow}
                onSelect={selectTimeWindow}
              />
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
      </div>
    </>
  );
}
