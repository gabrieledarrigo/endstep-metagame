import { type ReactNode, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import type { MatrixDeck } from "../../api/types";
import { EmptyWindow } from "../../components/EmptyWindow";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { PERIODS, WINDOWS } from "../../config";
import {
  formatWindow,
  metagameShares,
  pickDecks,
  rankDecks,
  readMeta,
  readableSearch,
  writeMeta,
} from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { Beat, BeatSkeleton } from "./Beat";
import { ExpectedRates, ExpectedRatesSkeleton } from "./ExpectedRates";
import { HowItWorks } from "./HowItWorks";
import { Metagame, MetagameSkeleton } from "./Metagame";
import { Pick, PickSkeleton } from "./Pick";
import "./WhatToPlayPage.css";

const COLUMNS_WIDTH = "(min-width: 1100px)";

function columns(
  wide: boolean,
  ranking: ReactNode,
  metagame: ReactNode,
): ReactNode {
  return (
    <div className="what-to-play__columns">
      {wide ? [ranking, metagame] : [metagame, ranking]}
    </div>
  );
}

export function WhatToPlayPage() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const wide = useMediaQuery(COLUMNS_WIDTH);
  const [open, setOpen] = useState(false);
  const matchups = useMatchups(timeWindow);
  const loadingWindow = matchups.isPlaceholderData;
  const loading = matchups.isPending || loadingWindow;
  const period = loadingWindow ? undefined : PERIODS[timeWindow];
  const meta = searchParams.get("meta");

  const writeChanges = (
    changes: Record<string, number>,
    decks: MatrixDeck[],
  ): void => {
    const params = new URLSearchParams(searchParams);
    const value = writeMeta(changes, decks);

    if (value === "") {
      params.delete("meta");
    } else {
      params.set("meta", value);
    }

    navigate({ search: `?${readableSearch(params)}`, hash }, { replace: true });
  };

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
                {columns(
                  wide,
                  <ExpectedRatesSkeleton key="ranking" />,
                  <MetagameSkeleton key="metagame" foldable={!wide} />,
                )}
                <BeatSkeleton />
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

              const changes = readMeta(meta, data.decks);
              const changed = Object.keys(changes).length > 0;
              const own = rankDecks(data, metagameShares(data.decks, {}));
              const ranking = changed
                ? rankDecks(data, metagameShares(data.decks, changes))
                : own;
              const pick = pickDecks(ranking);

              const step = (slug: string, by: 1 | -1): void => {
                writeChanges(
                  { ...changes, [slug]: (changes[slug] ?? 0) + by },
                  data.decks,
                );
              };

              return (
                <>
                  <Pick
                    decks={pick.decks}
                    more={pick.more}
                    changed={changed}
                    period={period}
                  />
                  {columns(
                    wide,
                    <ExpectedRates
                      key="ranking"
                      ranking={ranking}
                      baseline={own}
                      changed={changed}
                      period={period}
                    />,
                    <Metagame
                      key="metagame"
                      decks={data.decks}
                      changes={changes}
                      foldable={!wide}
                      open={open}
                      onToggle={() => setOpen(!open)}
                      onStep={step}
                      onReset={() => writeChanges({}, data.decks)}
                    />,
                  )}
                  <Beat
                    matrix={data}
                    ranking={ranking}
                    loadingWindow={loadingWindow}
                  />
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
