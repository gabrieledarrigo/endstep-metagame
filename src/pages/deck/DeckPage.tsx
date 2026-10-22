import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { fetchDeck } from "../../api/endpoints";
import type { DeckDetail } from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Skeleton } from "../../components/Skeleton";
import { StatePanel } from "../../components/StatePanel";
import { WINDOWS } from "../../config";
import { errorText, formatWindow } from "../../helpers";
import { useCanonicalLink } from "../../hooks/useCanonicalLink";
import { useHeadingFocus } from "../../hooks/useHeadingFocus";
import { useSampleCards } from "../../hooks/useSampleCards";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { DeckHero } from "./DeckHero";
import { DeckMatchups } from "./DeckMatchups";
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

function matchCount(detail: DeckDetail): number {
  return detail.deck.matchWinRate.wins + detail.deck.matchWinRate.losses;
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
  const { t } = useTranslation();
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

  const sampleCards = useSampleCards(
    deck.data?.deck.slug ?? slug,
    deck.data?.provenance.window.preset ?? timeWindow,
    deck.data !== undefined &&
      deck.data.sampleList.state !== "withheld" &&
      matchCount(deck.data) > 0,
  );

  const canonical = deck.data?.deck.slug;
  const loadingWindow = deck.isPlaceholderData;

  useHeadingFocus(headingState(deck));
  useCanonicalLink(!isUnknownDeck(deck));

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
          title={deck.isError ? t("deck.page.error") : t("deck.page.loading")}
          loading={deck.isPending}
        />
        {deck.isError ? (
          <>
            <div className="page__controls">
              <SegmentedControl
                label={t("common.timeWindow")}
                options={WINDOWS}
                labels={t("common.window", { returnObjects: true })}
                value={timeWindow}
                onChange={(next) => selectTimeWindow(next)}
              />
            </div>
            <StatePanel
              title={t("deck.page.failed")}
              detail={errorText(deck.error)}
              action={
                <Button onClick={() => deck.refetch()}>
                  {t("common.retry")}
                </Button>
              }
            />
          </>
        ) : (
          <DeckPageSkeleton />
        )}
      </>
    );
  }

  const detail = deck.data;
  const dates = formatWindow(detail.provenance.window);
  const matches = matchCount(detail);
  const hero = (
    <DeckHero
      deck={detail.deck}
      dates={loadingWindow ? undefined : dates}
      timeWindow={timeWindow}
      onSelect={(next) => selectTimeWindow(next, loadingWindow)}
      busy={loadingWindow}
    />
  );
  const loadingStatus = (
    <p className="visually-hidden" role="status">
      {loadingWindow
        ? t("deck.page.loadingWindow", {
            window: t(`common.window.${timeWindow}`),
          })
        : ""}
    </p>
  );

  if (matches === 0) {
    return (
      <div className="deck-page">
        {hero}
        {loadingStatus}
        {loadingWindow ? (
          <div aria-busy="true">
            <Skeleton className="deck-page__skeleton deck-page__skeleton--section" />
          </div>
        ) : (
          <EmptyWindow
            timeWindow={timeWindow}
            onSelect={selectTimeWindow}
            title={t("deck.page.noMatches.title")}
            detail={t("deck.page.noMatches.detail", {
              deck: detail.deck.name,
              window: t(`common.window.${timeWindow}`),
            })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="deck-page">
      {hero}
      {loadingStatus}
      <div
        className={loadingWindow ? "deck-page__body busy" : "deck-page__body"}
        aria-busy={loadingWindow || undefined}
      >
        <DeckStats deck={detail.deck} />
        <div className="deck-page__columns">
          <div className="deck-page__main">
            <DeckSection title={t("deck.page.sections.share.title")}>
              <DeckShare
                name={detail.deck.name}
                dates={loadingWindow ? undefined : dates}
                points={detail.shareSeries.points}
              />
            </DeckSection>
            <DeckSection
              title={t("deck.page.sections.games.title")}
              note={t("deck.page.sections.games.note")}
            >
              <GamesTable results={detail.gameResults} />
            </DeckSection>
            <div className="deck-page__pair">
              <DeckSection
                title={t("deck.page.sections.toss.title")}
                note={t("deck.page.sections.toss.note")}
              >
                <DeckToss playDraw={detail.playDraw} />
              </DeckSection>
              <DeckSection
                title={t("deck.page.sections.texture.title")}
                note={t("deck.page.sections.texture.note")}
              >
                <DeckTexture texture={detail.texture} />
              </DeckSection>
            </div>
          </div>
          <DeckSection title={t("deck.page.sections.sampleList.title")}>
            <SampleList
              key={`${detail.provenance.window.from}/${detail.provenance.window.to}`}
              list={detail.sampleList}
              cards={sampleCards.data?.cards}
              cardsPending={sampleCards.isPlaceholderData}
            />
          </DeckSection>
        </div>
        <DeckMatchups
          deck={detail.deck}
          detailWindow={detail.provenance.window}
          detailLoading={loadingWindow}
          timeWindow={timeWindow}
        />
      </div>
    </div>
  );
}
