import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  NavigationType,
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from "react-router";
import { fetchDeck } from "../../api/endpoints";
import { DeckPicker } from "../../components/DeckPicker";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { findDeck, formatWindow } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { MatchupList, MatchupListSkeleton } from "./MatchupList";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

const TABLE_WIDTH = "(min-width: 640px)";

export function MatchupsPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationType = useNavigationType();
  const { key, pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const wide = useMediaQuery(TABLE_WIDTH);
  const matchups = useMatchups(timeWindow);
  const loadingWindow = matchups.isPlaceholderData;
  const loading = matchups.isPending || loadingWindow;
  const decks = matchups.data?.decks ?? [];
  const slug = searchParams.get("deck") || null;
  const spotlit = slug === null ? undefined : findDeck(decks, slug);
  const outside =
    slug !== null && decks.length > 0 && spotlit === undefined ? slug : null;
  const missing = loadingWindow ? null : outside;
  const shown = spotlit ?? decks[0];
  const [revealing, setRevealing] = useState(
    navigationType !== NavigationType.Pop || key === "default" ? slug : null,
  );

  const detail = useQuery({
    queryKey: ["deck", outside, timeWindow],
    queryFn: ({ signal }) => fetchDeck(outside ?? "", timeWindow, signal),
    enabled: missing !== null,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === outside ? previous : undefined,
  });
  const missingName = detail.data?.deck.name ?? "This deck";
  const outsideLine =
    missing === null
      ? undefined
      : `${missingName} isn't in the top ${decks.length} for the selected time window.`;
  const notice =
    outsideLine === undefined || wide
      ? outsideLine
      : `${outsideLine} The table shows ${shown.name} by default.`;
  const named =
    detail.isError || (detail.isSuccess && !detail.isPlaceholderData);

  if (
    revealing !== null &&
    matchups.data !== undefined &&
    findDeck(decks, revealing) === undefined
  ) {
    setRevealing(null);
  }

  if (!wide && revealing !== null) {
    setRevealing(null);
  }

  const revealed = useCallback(() => setRevealing(null), []);

  useEffect(() => {
    if (key === "default" && slug !== null) {
      navigate({ pathname, search, hash }, { replace: true });
    }
  }, [key, slug, pathname, search, hash, navigate]);

  const selectDeck = (next: string | null): void => {
    setSearchParams(
      (params) => {
        if (next === null) {
          params.delete("deck");
        } else {
          params.set("deck", next);
        }

        return params;
      },
      { replace: true },
    );
    setRevealing(next);
  };

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
        {decks.length > 0 && (
          <DeckPicker
            decks={decks}
            value={wide ? (spotlit?.slug ?? outside) : (outside ?? shown.slug)}
            missing={
              outside === null
                ? undefined
                : { slug: outside, name: missingName }
            }
            stacked={!wide}
            onChange={selectDeck}
          />
        )}
        {matchups.data && !loadingWindow && (
          <span className="page__dates">
            {formatWindow(matchups.data.window)}
          </span>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {loading
          ? `Loading the ${timeWindow} window.`
          : named
            ? (outsideLine ?? "")
            : ""}
      </p>

      <div
        className={loadingWindow ? "page__body busy" : "page__body"}
        aria-busy={loadingWindow || undefined}
      >
        <Section
          query={matchups}
          skeleton={wide ? <MatchupTableSkeleton /> : <MatchupListSkeleton />}
          title="The matchup table could not be loaded"
        >
          {(data) => {
            if (data.decks.length === 0) {
              return (
                <EmptyWindow
                  timeWindow={timeWindow}
                  onSelect={selectTimeWindow}
                />
              );
            }

            if (!wide) {
              return (
                <MatchupList
                  matrix={data}
                  deck={shown}
                  timeWindow={loadingWindow ? undefined : timeWindow}
                  notice={notice}
                />
              );
            }

            return (
              <MatchupTable
                key={data.decks.map((deck) => deck.slug).join(" ")}
                matrix={data}
                timeWindow={loadingWindow ? undefined : timeWindow}
                spotlight={spotlit?.slug}
                reveal={
                  !loadingWindow && spotlit !== undefined && revealing === slug
                }
                onReveal={revealed}
                notice={notice}
              />
            );
          }}
        </Section>
      </div>
    </>
  );
}
