import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { fetchDeck } from "../../api/endpoints";
import type { DeckDetail } from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Skeleton } from "../../components/Skeleton";
import { StatePanel } from "../../components/StatePanel";
import { formatWindow } from "../../format";
import { useHeadingFocus } from "../../hooks/useHeadingFocus";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckHero } from "./DeckHero";
import { DeckNotFound } from "./DeckNotFound";
import { DeckSection } from "./DeckSection";
import { DeckShare } from "./DeckShare";
import { DeckStats } from "./DeckStats";
import { DeckTexture } from "./DeckTexture";
import { DeckToss } from "./DeckToss";
import { GamesTable } from "./GamesTable";
import { SampleList } from "./SampleList";
import "./DeckPage.css";

function isUnknownDeck(deck: UseQueryResult<DeckDetail>): boolean {
  return (
    deck.error instanceof ApiError &&
    (deck.error.status === 404 || deck.error.status === 400)
  );
}

function headingState(deck: UseQueryResult<DeckDetail>): string {
  if (deck.data !== undefined) {
    return "deck";
  }

  return isUnknownDeck(deck) ? "unknown" : deck.status;
}

function DeckPageSkeleton() {
  return (
    <div className="deck-page" aria-busy="true">
      <Skeleton className="deck-page__skeleton deck-page__skeleton--hero" />
      <Skeleton className="deck-page__skeleton deck-page__skeleton--stats" />
      <Skeleton className="deck-page__skeleton deck-page__skeleton--section" />
    </div>
  );
}

export function DeckPage() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const deck = useQuery({
    queryKey: ["deck", slug, timeWindow],
    queryFn: ({ signal }) => fetchDeck(slug, timeWindow, signal),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === slug ? previous : undefined,
  });
  const canonical = deck.data?.deck.slug;
  const loadingWindow = deck.isPlaceholderData;

  useHeadingFocus(headingState(deck));

  useEffect(() => {
    if (canonical !== undefined && canonical !== slug) {
      navigate(
        {
          pathname: `/decks/${canonical}`,
          search: location.search,
          hash: location.hash,
        },
        { replace: true },
      );
    }
  }, [canonical, slug, navigate, location.search, location.hash]);

  if (deck.data === undefined) {
    if (isUnknownDeck(deck)) {
      return <DeckNotFound slug={slug} />;
    }

    return (
      <>
        <PageTitle
          title={deck.isError ? "Deck" : "Loading the deck"}
          loading={deck.isPending}
        />
        {deck.isError ? (
          <StatePanel
            title="The deck could not be loaded"
            detail={deck.error.message}
            action={<Button onClick={() => deck.refetch()}>Retry</Button>}
          />
        ) : (
          <DeckPageSkeleton />
        )}
      </>
    );
  }

  const detail = deck.data;
  const dates = formatWindow(detail.provenance.window);
  const matches =
    detail.deck.matchWinRate.wins + detail.deck.matchWinRate.losses;
  const hero = (
    <DeckHero
      deck={detail.deck}
      dates={dates}
      timeWindow={timeWindow}
      onSelect={(next) => selectTimeWindow(next, loadingWindow)}
      busy={loadingWindow}
    />
  );
  const loadingStatus = (
    <p className="visually-hidden" role="status">
      {loadingWindow ? `Loading the ${timeWindow} window.` : ""}
    </p>
  );

  if (matches === 0) {
    return (
      <div className="deck-page">
        {hero}
        {loadingStatus}
        <EmptyWindow
          timeWindow={timeWindow}
          onSelect={selectTimeWindow}
          title="No matches in this window"
          detail={`${detail.deck.name} has no matches in the ${timeWindow} window.`}
        />
      </div>
    );
  }

  return (
    <div className="deck-page">
      {hero}
      {loadingStatus}
      <div
        className={
          loadingWindow
            ? "deck-page__body deck-page__body--busy"
            : "deck-page__body"
        }
        aria-busy={loadingWindow || undefined}
      >
        <DeckStats deck={detail.deck} />
        <div className="deck-page__columns">
          <div className="deck-page__main">
            <DeckSection title="Share over time">
              <DeckShare
                name={detail.deck.name}
                dates={dates}
                points={detail.shareSeries.points}
              />
            </DeckSection>
            <DeckSection
              title="Games"
              note="Game win rate, by game in the match and by who played first."
            >
              <GamesTable results={detail.gameResults} />
            </DeckSection>
            <div className="deck-page__pair">
              <DeckSection title="Toss" note="Game 1 win rate after the toss.">
                <DeckToss playDraw={detail.playDraw} />
              </DeckSection>
              <DeckSection
                title="Texture"
                note="How a game with this deck tends to run."
              >
                <DeckTexture texture={detail.texture} />
              </DeckSection>
            </div>
          </div>
          <DeckSection title="Sample list">
            <SampleList list={detail.sampleList} />
          </DeckSection>
        </div>
      </div>
    </div>
  );
}
