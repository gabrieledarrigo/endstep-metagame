import { Fragment, type ReactNode } from "react";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { type RankedDeck, percent } from "../../helpers";
import "./Pick.css";

function joined(items: ReactNode[], last: string): ReactNode[] {
  return items.map((item, index) => {
    if (index === 0) {
      return <Fragment key={index}>{item}</Fragment>;
    }

    const separator = index === items.length - 1 ? ` ${last} ` : ", ";

    return (
      <Fragment key={index}>
        {separator}
        {item}
      </Fragment>
    );
  });
}

function moreText(more: number): string {
  if (more === 0) {
    return "";
  }

  if (more === 1) {
    return ", and 1 more deck is just as close";
  }

  return `, and ${more} more decks are just as close`;
}

function why(decks: RankedDeck[], more: number): ReactNode {
  if (decks.length === 1) {
    return `${decks[0].deck.name} wins ${percent(decks[0].rate)} of its matches against the metagame you expect.`;
  }

  const rates = decks.map((entry) => percent(entry.rate));

  return (
    <>
      They win the most matches against the metagame you expect:{" "}
      {joined(rates, "and")}. The gap between them is too small to call
      {moreText(more)}.
    </>
  );
}

type PickProps = {
  decks: RankedDeck[];
  more: number;
  period?: string;
};

export function Pick({ decks, more, period }: PickProps) {
  const links = decks.map((entry) => (
    <WindowLink className="pick__deck" to={`/decks/${entry.deck.slug}`}>
      {entry.deck.name}
    </WindowLink>
  ));

  return (
    <Panel className="pick">
      <span className="pick__label">Our pick</span>
      <h2 className="pick__title" aria-live="polite" aria-atomic="true">
        Play {joined(links, "or")}!
      </h2>
      <p className="pick__why">{why(decks, more)}</p>
      {period !== undefined && (
        <p className="pick__basis">Based on {period}.</p>
      )}
    </Panel>
  );
}

export function PickSkeleton() {
  return (
    <Panel className="pick" aria-busy="true">
      <span className="pick__label">Our pick</span>
      <Skeleton className="pick__skeleton-title" />
      <Skeleton className="pick__skeleton-line" />
    </Panel>
  );
}
