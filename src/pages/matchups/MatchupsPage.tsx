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
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { findDeck, formatWindow } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckPicker } from "./DeckPicker";
import { MatchupTable, MatchupTableSkeleton } from "./MatchupTable";

export function MatchupsPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationType = useNavigationType();
  const { key, pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const matchups = useMatchups(timeWindow);
  const loadingWindow = matchups.isPlaceholderData;
  const loading = matchups.isPending || loadingWindow;
  const decks = matchups.data?.decks ?? [];
  const slug = searchParams.get("deck") || null;
  const spotlit = slug === null ? undefined : findDeck(decks, slug);
  const missing =
    slug !== null && !loadingWindow && decks.length > 0 && spotlit === undefined
      ? slug
      : null;
  const [revealing, setRevealing] = useState(
    navigationType !== NavigationType.Pop || key === "default" ? slug : null,
  );

  const detail = useQuery({
    queryKey: ["deck", missing, timeWindow],
    queryFn: ({ signal }) => fetchDeck(missing ?? "", timeWindow, signal),
    enabled: missing !== null,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === missing ? previous : undefined,
  });
  const missingName = detail.data?.deck.name ?? "This deck";
  const notice =
    missing === null
      ? undefined
      : `${missingName} isn't in the top ${decks.length} for the selected time window.`;

  if (
    revealing !== null &&
    matchups.data !== undefined &&
    findDeck(decks, revealing) === undefined
  ) {
    setRevealing(null);
  }

  const revealed = useCallback(() => setRevealing(null), []);

  useEffect(() => {
    if (key === "default") {
      navigate({ pathname, search, hash }, { replace: true });
    }
  }, [key, pathname, search, hash, navigate]);

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
            value={spotlit?.slug ?? missing}
            missing={
              missing === null
                ? undefined
                : { slug: missing, name: missingName }
            }
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
        {loading ? `Loading the ${timeWindow} window.` : (notice ?? "")}
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
                spotlight={spotlit?.slug}
                reveal={
                  !loadingWindow && spotlit !== undefined && revealing === slug
                }
                onReveal={revealed}
                notice={notice}
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
