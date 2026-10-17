import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
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

const VIEWS = ["Cards", "Table"] as const;

type View = (typeof VIEWS)[number];

export function OverviewPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = searchParams.get("view") === "table" ? "Table" : "Cards";
  const decks = useQuery({
    queryKey: ["decks", timeWindow],
    queryFn: ({ signal }) => fetchDecks(timeWindow, signal),
    placeholderData: (previous) =>
      previous?.decks.items.length ? previous : undefined,
  });
  const series = useQuery({
    queryKey: ["series", timeWindow],
    queryFn: ({ signal }) => fetchSeries(timeWindow, signal),
    placeholderData: (previous) =>
      previous?.series.length ? previous : undefined,
  });

  const loadingWindow = decks.isPlaceholderData || series.isPlaceholderData;
  const loading = decks.isPending || series.isPending || loadingWindow;

  const selectView = (next: View): void => {
    if (next === view) {
      return;
    }

    setSearchParams(
      (params) => {
        if (next === "Table") {
          params.set("view", "table");
        } else {
          params.delete("view");
        }
        return params;
      },
      { replace: true },
    );
  };

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
        <SegmentedControl
          label="View"
          options={VIEWS}
          value={view}
          onChange={selectView}
        />
      </div>

      <p className="visually-hidden" role="status">
        {loading ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <div
        className={loadingWindow ? "page__body busy" : "page__body"}
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
          skeleton={
            view === "Table" ? <DeckTableSkeleton /> : <DeckGridSkeleton />
          }
          title={
            view === "Table"
              ? "The deck table could not be loaded"
              : "The deck grid could not be loaded"
          }
        >
          {(data) => {
            if (data.decks.items.length === 0) {
              return (
                <EmptyWindow
                  timeWindow={timeWindow}
                  onSelect={selectTimeWindow}
                />
              );
            }

            return view === "Table" ? (
              <DeckTable decks={data.decks.items} />
            ) : (
              <DeckGrid decks={data.decks.items} />
            );
          }}
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
