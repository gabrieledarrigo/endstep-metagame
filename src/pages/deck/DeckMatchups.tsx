import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Deck, MatchupMatrix, TimeWindow } from "../../api/types";
import { MatchupGrid } from "../../components/MatchupGrid";
import { MatchupLegend } from "../../components/MatchupLegend";
import { Panel } from "../../components/Panel";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { formatWindow } from "../../helpers";
import { useMatchups } from "../../hooks/useMatchups";
import { DeckSection } from "./DeckSection";
import "./DeckMatchups.css";

const TOP = 24;

type MatchupRowProps = {
  deck: Deck;
  matrix: MatchupMatrix;
  loading: boolean;
  timeWindow: TimeWindow;
};

function DeckName({ name }: { name: string }) {
  return name;
}

function MatchupRow({ deck, matrix, loading, timeWindow }: MatchupRowProps) {
  const { t } = useTranslation();
  const row = matrix.decks.find((item) => item.id === deck.id);

  if (row) {
    const others = matrix.decks.filter((item) => item.id !== deck.id);
    const label = {
      deck: row.name,
      count: others.length,
      others: others.length,
      top: matrix.decks.length,
    };

    return (
      <>
        <MatchupGrid
          key={others.map((item) => item.slug).join(" ")}
          rows={[row]}
          columns={others}
          cells={matrix.cells}
          label={
            loading
              ? t("deck.matchups.grid", label)
              : t("deck.matchups.gridWindow", {
                  ...label,
                  window: t(`common.window.${timeWindow}`),
                })
          }
          linkRows={false}
          contained
        />
        <MatchupLegend mirror={false} />
        <p className="deck-matchups__more">
          <Link
            to={{
              pathname: "/matchups",
              search: `?${new URLSearchParams({ window: timeWindow, deck: deck.slug })}`,
            }}
          >
            {t("deck.matchups.more", { deck: deck.name })}
          </Link>
        </p>
      </>
    );
  }

  if (loading) {
    return <Skeleton className="deck-matchups__skeleton" />;
  }

  if (matrix.decks.length > 0) {
    return (
      <Panel>
        <p className="deck-matchups__outside">
          <Trans
            i18nKey="deck.matchups.outside"
            values={{ top: matrix.decks.length }}
            components={{
              deck: <DeckName name={deck.name} />,
              matchups: <WindowLink to="/matchups" />,
            }}
          />
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <p className="deck-matchups__outside">{t("deck.matchups.none")}</p>
    </Panel>
  );
}

type DeckMatchupsProps = {
  deck: Deck;
  detailWindow: { from: string; to: string };
  detailLoading: boolean;
  timeWindow: TimeWindow;
};

export function DeckMatchups({
  deck,
  detailWindow,
  detailLoading,
  timeWindow,
}: DeckMatchupsProps) {
  const { t } = useTranslation();
  const matchups = useMatchups(timeWindow);
  const matrix = matchups.data;
  const loading = matchups.isPlaceholderData;
  const otherDates =
    matrix !== undefined &&
    !loading &&
    !detailLoading &&
    (matrix.window.from !== detailWindow.from ||
      matrix.window.to !== detailWindow.to);

  return (
    <DeckSection
      className="deck-matchups"
      title={t("deck.matchups.title", { top: matrix?.decks.length || TOP })}
    >
      {otherDates && matrix && (
        <p className="deck-matchups__dates">
          {t("deck.matchups.dates", { dates: formatWindow(matrix.window) })}
        </p>
      )}
      <div
        className={
          loading && !detailLoading
            ? "deck-matchups__body busy"
            : "deck-matchups__body"
        }
        aria-busy={loading || matchups.isPending || undefined}
      >
        <Section
          query={matchups}
          skeleton={<Skeleton className="deck-matchups__skeleton" />}
          title={t("deck.matchups.failed")}
        >
          {(data) => (
            <MatchupRow
              deck={deck}
              matrix={data}
              loading={loading}
              timeWindow={timeWindow}
            />
          )}
        </Section>
      </div>
    </DeckSection>
  );
}
