import type { UseQueryResult } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

const LISTS = ["Main deck", "Sideboard"] as const;
const FIRST = 30;
const MORE = 20;

type List = (typeof LISTS)[number];

type StaplesProps = {
  query: UseQueryResult<StaplesResponse>;
  timeWindow: TimeWindow;
  section: StaplesSection;
  onSection: (next: StaplesSection) => void;
  onWindow: (next: TimeWindow) => void;
  busy: boolean;
};

function withheldText(withheld: number): string {
  if (withheld === 1) {
    return "1 deck is left out because Endstep withholds its cards.";
  }

  return `${withheld} decks are left out because Endstep withholds their cards.`;
}

export function Staples({
  query,
  timeWindow,
  section,
  onSection,
  onWindow,
  busy,
}: StaplesProps) {
  const id = useId();
  const key = `${timeWindow}:${section}`;
  const [listKey, setListKey] = useState(key);
  const [more, setMore] = useState(false);
  const firstMore = useRef<HTMLLIElement>(null);

  if (listKey !== key) {
    setListKey(key);
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
          Most played cards
        </h2>
        <SegmentedControl<List>
          label="Part of the deck"
          options={LISTS}
          value={section === "side" ? "Sideboard" : "Main deck"}
          onChange={(next) => onSection(next === "Sideboard" ? "side" : "main")}
        />
      </div>
      <p className="staples__note">
        The percentage is the share of the top 24's decks that play the card.
      </p>
      <div
        className={busy ? "staples__body busy" : "staples__body"}
        aria-busy={busy || undefined}
      >
        <Section
          query={query}
          skeleton={<Skeleton className="staples__skeleton" />}
          title="The staples could not be loaded"
        >
          {(data) => {
            if (data.cards.length === 0) {
              return data.withheld > 0 ? (
                <EmptyWindow
                  timeWindow={timeWindow}
                  onSelect={onWindow}
                  title="No cards in this window"
                  detail={withheldText(data.withheld)}
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
                      key={card.name}
                      card={card}
                      place={index + 1}
                      top={data.cards[0].share}
                      ref={index === FIRST ? firstMore : undefined}
                    />
                  ))}
                </ol>
                {rest > 0 && (
                  <Button
                    variant="secondary"
                    className="staples__more"
                    onClick={showMore}
                  >
                    Show {Math.min(MORE, rest)} more
                  </Button>
                )}
                {data.withheld > 0 && (
                  <p className="staples__note">{withheldText(data.withheld)}</p>
                )}
              </>
            );
          }}
        </Section>
      </div>
    </section>
  );
}
