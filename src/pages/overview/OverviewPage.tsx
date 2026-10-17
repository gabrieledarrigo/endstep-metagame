import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { fetchDecks, fetchSeries, searchDecks } from "../../api/endpoints";
import type { Deck, DecksResponse } from "../../api/types";
import { Button } from "../../components/Button";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { StatePanel } from "../../components/StatePanel";
import { WINDOWS } from "../../config";
import { formatCount, searchTerm } from "../../helpers";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckGrid, DeckGridSkeleton } from "./DeckGrid";
import { DeckSearch } from "./DeckSearch";
import { DeckTable, DeckTableSkeleton } from "./DeckTable";
import { EmptyWindow } from "../../components/EmptyWindow";
import { RankedBars, RankedBarsSkeleton } from "./RankedBars";
import { SearchResults } from "./SearchResults";
import { ShareOverTime, ShareOverTimeSkeleton } from "./ShareOverTime";
import { Summary, SummarySkeleton } from "./Summary";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

const VIEWS = ["Cards", "Table"] as const;

type View = (typeof VIEWS)[number];

function loadedCount(pages: DecksResponse[]): number {
  return pages.reduce((count, page) => count + page.decks.items.length, 0);
}

function uniqueDecks(pages: DecksResponse[]): Deck[] {
  const seen = new Set<string>();

  return pages
    .flatMap((page) => page.decks.items)
    .filter((deck) => {
      if (seen.has(deck.id)) {
        return false;
      }

      seen.add(deck.id);
      return true;
    });
}

function quoted(term: string): string {
  return `\u201c${term}\u201d`;
}

function matchLine(total: number, term: string): string {
  return total === 1
    ? `1 deck matches ${quoted(term)}.`
    : `${formatCount(total)} decks match ${quoted(term)}.`;
}

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

  const term = searchTerm(searchParams.get("q"));
  const searching = term !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [previousTerm, setPreviousTerm] = useState(term);
  const [fromTopList, setFromTopList] = useState(false);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);

  if (term !== previousTerm) {
    setPreviousTerm(term);
    setFromTopList(previousTerm === null);
  }

  const search = useInfiniteQuery({
    queryKey: ["search", timeWindow, term],
    queryFn:
      term === null
        ? skipToken
        : ({ pageParam, signal }): Promise<DecksResponse> =>
            searchDecks(timeWindow, term, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      loadedCount(pages) < last.decks.total ? last.decks.page + 1 : undefined,
    placeholderData: (previous, previousQuery) =>
      previous?.pages[0]?.decks.items.length &&
      (previousQuery?.queryKey[2] === term || !fromTopList)
        ? previous
        : undefined,
  });

  const found = searching ? search.data : undefined;
  const searchLoadingWindow =
    searching &&
    search.isPlaceholderData &&
    found?.pages[0]?.provenance.window.preset !== timeWindow;
  const loadingWindow =
    decks.isPlaceholderData || series.isPlaceholderData || searchLoadingWindow;
  const loading = decks.isPending || series.isPending || loadingWindow;
  const loadingTerm =
    searching &&
    (search.isPending || search.isPlaceholderData) &&
    !loadingWindow;
  const topList =
    searching && fromTopList && !decks.isPlaceholderData
      ? (decks.data?.decks.items ?? [])
      : [];
  const results = found ? uniqueDecks(found.pages) : [];
  const total = found?.pages.at(-1)?.decks.total ?? 0;
  const foundTerm = found?.pages[0]?.query.q ?? term ?? "";

  const onSearch = useCallback(
    (next: string | null): void => {
      if (searchParams.get("q") === next) {
        return;
      }

      setSearchParams(
        (params) => {
          if (next === null) {
            params.delete("q");
          } else {
            params.set("q", next);
          }
          return params;
        },
        { replace: true },
      );
    },
    [searchParams, setSearchParams],
  );

  const clearSearch = (): void => {
    onSearch(null);
    inputRef.current?.focus();
  };

  const showMore = (): void => {
    setFocusFrom(results.length);
    void search.fetchNextPage();
  };

  const deckView = (items: Deck[], caption?: string): ReactNode =>
    view === "Table" ? (
      <DeckTable decks={items} caption={caption} />
    ) : (
      <DeckGrid decks={items} />
    );
  const viewSkeleton =
    view === "Table" ? <DeckTableSkeleton /> : <DeckGridSkeleton />;

  let status = "";
  if (loading) {
    status = `Loading the ${timeWindow} window.`;
  } else if (loadingTerm) {
    status = `Searching for ${quoted(term)}.`;
  } else if (searching && search.isSuccess) {
    status =
      total === 0
        ? `No deck or card matches ${quoted(term)}.`
        : matchLine(total, term);
  }

  const selectView = (next: View): void => {
    const written = next === "Table" ? "table" : null;

    if (searchParams.get("view") === written) {
      return;
    }

    setSearchParams(
      (params) => {
        if (written === null) {
          params.delete("view");
        } else {
          params.set("view", written);
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
        {status}
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

        <SearchResults
          field={
            <DeckSearch term={term} onSearch={onSearch} inputRef={inputRef} />
          }
          found={
            results.length > 0 ? { term: foundTerm, total: total } : undefined
          }
          more={
            searching && search.hasNextPage
              ? {
                  remaining: total - loadedCount(found?.pages ?? []),
                  loading: search.isFetchingNextPage,
                  onMore: showMore,
                }
              : undefined
          }
          busy={loadingTerm && (found !== undefined || topList.length > 0)}
          focus={
            focusFrom === null || search.hasNextPage
              ? undefined
              : results[focusFrom]?.slug
          }
          onFocused={() => setFocusFrom(null)}
        >
          {searching ? (
            <Section
              query={search}
              skeleton={topList.length > 0 ? deckView(topList) : viewSkeleton}
              title="The search could not be loaded"
            >
              {(data) => {
                if (data.pages[0]?.decks.items.length === 0) {
                  return (
                    <StatePanel
                      title={`No deck or card matches ${quoted(term)}`}
                      detail="Search covers deck names and every card in their lists, in the selected window."
                      action={
                        <Button variant="secondary" onClick={clearSearch}>
                          Clear the search
                        </Button>
                      }
                    />
                  );
                }

                return deckView(
                  uniqueDecks(data.pages),
                  `Decks that match ${quoted(foundTerm)}, sortable by column`,
                );
              }}
            </Section>
          ) : (
            <Section
              query={decks}
              skeleton={viewSkeleton}
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

                return deckView(data.decks.items);
              }}
            </Section>
          )}
        </SearchResults>

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
