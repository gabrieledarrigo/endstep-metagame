import type { UseQueryResult } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import type {
  StaplesResponse,
  StaplesSection,
  TimeWindow,
} from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyWindow } from "../../components/EmptyWindow";
import { Section } from "../../components/Section";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Skeleton } from "../../components/Skeleton";
import { Staple } from "./Staple";
import "./Staples.css";

const SECTIONS = ["main", "side"] as const;
const FIRST = 30;
const MORE = 20;

type StaplesProps = {
  query: UseQueryResult<StaplesResponse>;
  timeWindow: TimeWindow;
  section: StaplesSection;
  onSection: (next: StaplesSection) => void;
  onWindow: (next: TimeWindow) => void;
};

export function Staples({
  query,
  timeWindow,
  section,
  onSection,
  onWindow,
}: StaplesProps) {
  const { t } = useTranslation();
  const id = useId();
  const dimmed = query.isPlaceholderData;
  const loading = query.isPending || dimmed;
  const [listKey, setListKey] = useState("");
  const current = query.data ? `${timeWindow}:${section}` : "";
  const shown = dimmed ? listKey : current;
  const [more, setMore] = useState(false);
  const firstMore = useRef<HTMLButtonElement>(null);

  if (listKey !== shown) {
    setListKey(shown);
    setMore(false);
  }

  const showMore = (): void => {
    flushSync(() => setMore(true));
    firstMore.current?.focus();
  };

  return (
    <section className="staples" aria-labelledby={id}>
      <div className="staples__head">
        <h2 className="staples__title" id={id}>
          {t("staples.staples.heading")}
        </h2>
        <SegmentedControl
          label={t("staples.staples.part")}
          options={SECTIONS}
          labels={t("staples.staples.lists", { returnObjects: true })}
          value={section}
          onChange={onSection}
          busy={loading}
        />
      </div>
      <p className="staples__note">{t("staples.staples.note")}</p>
      <div
        className={dimmed ? "staples__body busy" : "staples__body"}
        aria-busy={dimmed || undefined}
      >
        <Section
          query={query}
          skeleton={<Skeleton className="staples__skeleton" />}
          title={t("staples.staples.error")}
        >
          {(data) => {
            if (data.cards.length === 0) {
              return data.withheld > 0 ? (
                <EmptyWindow
                  timeWindow={timeWindow}
                  onSelect={onWindow}
                  title={t("staples.staples.emptyTitle")}
                  detail={t("staples.staples.withheld", {
                    count: data.withheld,
                  })}
                />
              ) : (
                <EmptyWindow timeWindow={timeWindow} onSelect={onWindow} />
              );
            }

            const cards = data.cards.slice(0, more ? FIRST + MORE : FIRST);
            const rest =
              Math.min(data.cards.length, FIRST + MORE) - cards.length;

            return (
              <>
                <ol className="staples__list">
                  {cards.map((card, index) => (
                    <Staple
                      key={`${timeWindow}:${section}:${card.name}`}
                      card={card}
                      place={index + 1}
                      top={data.cards[0].share}
                      ref={index === FIRST ? firstMore : undefined}
                    />
                  ))}
                </ol>
                {rest > 0 && !dimmed && (
                  <Button
                    variant="secondary"
                    className="staples__more"
                    onClick={showMore}
                  >
                    {t("staples.staples.more", {
                      count: Math.min(MORE, rest),
                    })}
                  </Button>
                )}
                {data.withheld > 0 && (
                  <p className="staples__note">
                    {t("staples.staples.withheld", { count: data.withheld })}
                  </p>
                )}
              </>
            );
          }}
        </Section>
      </div>
    </section>
  );
}
