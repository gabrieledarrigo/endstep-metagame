import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { fetchDecks, fetchSeries, searchDecks } from "../../api/endpoints";
import type { Deck, DecksResponse } from "../../api/types";
import { Button } from "../../components/Button";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { StatePanel } from "../../components/StatePanel";
import { WINDOWS } from "../../config";
import { errorText, formatCount, quoted, searchTerm } from "../../helpers";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckGrid, DeckGridSkeleton } from "./DeckGrid";
import { DeckSearch, type DeckSearchHandle } from "./DeckSearch";
import { DeckTable, DeckTableSkeleton } from "./DeckTable";
import { EmptyWindow } from "../../components/EmptyWindow";
import { RankedBars, RankedBarsSkeleton } from "./RankedBars";
import { SearchResults } from "./SearchResults";
import { ShareOverTime, ShareOverTimeSkeleton } from "./ShareOverTime";
import { Summary, SummarySkeleton } from "./Summary";
import { WinRateScatter, WinRateScatterSkeleton } from "./WinRateScatter";

const VIEWS = ["cards", "table"] as const;

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

export function OverviewPage() {
  const { t } = useTranslation();
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = searchParams.get("view") === "table" ? "table" : "cards";
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
  const searchField = useRef<DeckSearchHandle>(null);
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
      last.decks.items.length > 0 && loadedCount(pages) < last.decks.total
        ? last.decks.page + 1
        : undefined,
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
    searchField.current?.clear();
  };

  const showMore = (): void => {
    setFocusFrom(results.length);
    void search.fetchNextPage();
  };

  const deckView = (items: Deck[], caption?: string): ReactNode =>
    view === "table" ? (
      <DeckTable decks={items} caption={caption} />
    ) : (
      <DeckGrid decks={items} />
    );
  const viewSkeleton =
    view === "table" ? <DeckTableSkeleton /> : <DeckGridSkeleton />;

  const moreError =
    searching && search.isFetchNextPageError && !search.isFetchingNextPage
      ? t("overview.overviewPage.moreError", {
          error: errorText(search.error),
        })
      : undefined;

  const shortfall =
    searching &&
    found !== undefined &&
    !search.isPlaceholderData &&
    !search.hasNextPage &&
    results.length > 0 &&
    results.length < total
      ? t("overview.overviewPage.shortfall", {
          count: total,
          returned: formatCount(results.length),
          total: formatCount(total),
        })
      : undefined;

  const statusText = (): string => {
    if (loading) {
      return t("overview.overviewPage.status.loading", {
        window: t(`common.window.${timeWindow}`),
      });
    }

    if (loadingTerm) {
      return t("overview.overviewPage.status.searching", {
        term: quoted(term),
      });
    }

    if (moreError) {
      return moreError;
    }

    if (shortfall) {
      return shortfall;
    }

    if (!searching) {
      return "";
    }

    if (found === undefined) {
      return search.isError
        ? t("overview.overviewPage.status.searchError")
        : "";
    }

    if (results.length === 0) {
      return t("overview.overviewPage.status.noMatch", {
        term: quoted(term),
      });
    }

    return t("overview.overviewPage.status.found", {
      count: total,
      decks: formatCount(total),
      term: quoted(foundTerm),
    });
  };

  const selectView = (next: View): void => {
    const written = next === "cards" ? null : next;

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
      <PageTitle title={t("overview.title")} />

      <div className="page__controls">
        <SegmentedControl
          label={t("common.timeWindow")}
          options={WINDOWS}
          labels={t("common.window", { returnObjects: true })}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
        <SegmentedControl
          label={t("overview.overviewPage.view.label")}
          options={VIEWS}
          labels={{
            cards: t("overview.overviewPage.view.cards"),
            table: t("overview.overviewPage.view.table"),
          }}
          value={view}
          onChange={selectView}
        />
      </div>

      <p className="visually-hidden" role="status">
        {statusText()}
      </p>

      <div
        className={loadingWindow ? "page__body busy" : "page__body"}
        aria-busy={loadingWindow || undefined}
      >
        <Section
          query={decks}
          skeleton={<SummarySkeleton />}
          title={t("overview.overviewPage.errors.summary")}
        >
          {(data) => <Summary decks={data} loading={decks.isPlaceholderData} />}
        </Section>

        <SearchResults
          field={
            <DeckSearch term={term} onSearch={onSearch} ref={searchField} />
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
          note={moreError ?? shortfall}
          busy={loadingTerm && (found !== undefined || topList.length > 0)}
          focus={
            focusFrom === null || search.hasNextPage
              ? undefined
              : (results[focusFrom] ?? results.at(-1))?.slug
          }
          onFocused={() => setFocusFrom(null)}
        >
          {searching ? (
            <Section
              query={search}
              skeleton={topList.length > 0 ? deckView(topList) : viewSkeleton}
              title={t("overview.overviewPage.errors.search")}
            >
              {() => {
                if (results.length === 0) {
                  return (
                    <StatePanel
                      title={t("overview.overviewPage.noMatch.title", {
                        term: quoted(term),
                      })}
                      detail={t("overview.overviewPage.noMatch.detail")}
                      action={
                        <Button variant="secondary" onClick={clearSearch}>
                          {t("overview.overviewPage.noMatch.clear")}
                        </Button>
                      }
                    />
                  );
                }

                return deckView(
                  results,
                  t("overview.overviewPage.caption", {
                    term: quoted(foundTerm),
                  }),
                );
              }}
            </Section>
          ) : (
            <Section
              query={decks}
              skeleton={viewSkeleton}
              title={
                view === "table"
                  ? t("overview.overviewPage.errors.table")
                  : t("overview.overviewPage.errors.grid")
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
          title={t("overview.overviewPage.errors.shareOverTime")}
        >
          {(data) => <ShareOverTime series={data.series} />}
        </Section>

        <Section
          query={decks}
          skeleton={<RankedBarsSkeleton />}
          title={t("overview.overviewPage.errors.rankedBars")}
        >
          {(data) => <RankedBars decks={data.decks} />}
        </Section>

        <Section
          query={decks}
          skeleton={<WinRateScatterSkeleton />}
          title={t("overview.overviewPage.errors.winRateScatter")}
        >
          {(data) => <WinRateScatter decks={data.decks.items} />}
        </Section>
      </div>
    </>
  );
}
