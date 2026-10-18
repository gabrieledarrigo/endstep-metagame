import type { MatrixDeck } from "../../api/types";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { PERIODS, WINDOWS } from "../../config";
import { formatWindow, pickDecks, rankDecks } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { ExpectedRates, ExpectedRatesSkeleton } from "./ExpectedRates";
import { HowItWorks } from "./HowItWorks";
import { Pick, PickSkeleton } from "./Pick";
import "./WhatToPlayPage.css";

function sharesOf(decks: MatrixDeck[]): Record<string, number> {
  return Object.fromEntries(decks.map((deck) => [deck.slug, deck.share]));
}

export function WhatToPlayPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const matchups = useMatchups(timeWindow);
  const loadingWindow = matchups.isPlaceholderData;
  const loading = matchups.isPending || loadingWindow;
  const period = loadingWindow ? undefined : PERIODS[timeWindow];

  return (
    <>
      <PageTitle title="What to play?" />

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
        {matchups.data && !loadingWindow && (
          <span className="page__dates">
            {formatWindow(matchups.data.window)}
          </span>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {loading ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <div className="page__body what-to-play">
        <div
          className={
            loadingWindow
              ? "what-to-play__results busy"
              : "what-to-play__results"
          }
          aria-busy={loadingWindow || undefined}
        >
          <Section
            query={matchups}
            skeleton={
              <>
                <PickSkeleton />
                <ExpectedRatesSkeleton />
              </>
            }
            title="The ranking could not be loaded"
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

              const ranking = rankDecks(data, sharesOf(data.decks));
              const pick = pickDecks(ranking);

              return (
                <>
                  <Pick decks={pick.decks} more={pick.more} period={period} />
                  <ExpectedRates ranking={ranking} period={period} />
                </>
              );
            }}
          </Section>
        </div>
        <HowItWorks />
      </div>
    </>
  );
}
