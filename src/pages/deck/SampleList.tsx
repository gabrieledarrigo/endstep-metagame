import { useRef, useState } from "react";
import type { SampleCard, SampleList as SampleListData } from "../../api/types";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { formatCount } from "../../helpers";
import "./SampleList.css";

function sorted(cards: SampleCard[]): SampleCard[] {
  return [...cards].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "en-GB"),
  );
}

function total(cards: SampleCard[]): number {
  return cards.reduce((sum, card) => sum + card.count, 0);
}

function lines(cards: SampleCard[]): string {
  return cards.map((card) => `${card.count} ${card.name}`).join("\n");
}

function players(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "player" : "players"}`;
}

function source(list: SampleListData): string {
  const brought = players(list.players ?? 0);

  if (list.state === "mainOnly") {
    return `${brought} brought this exact main deck.`;
  }

  const lists = `the most common of ${formatCount(list.distinctLists)} distinct lists.`;
  const likeness =
    list.similarity === null
      ? `It is ${lists}`
      : `It is ${Math.round(list.similarity * 100)}% like the deck's average list, and ${lists}`;

  return `${brought} brought this exact list. ${likeness}`;
}

function withheldNote(list: SampleListData): string {
  if (list.reason === "no_registrations") {
    return "No list to show. No list was registered for this deck in this window.";
  }

  return `No list to show. No main deck was brought by ${list.minPlayers} or more players in this window.`;
}

function CardList({ title, cards }: { title: string; cards: SampleCard[] }) {
  return (
    <>
      <h3 className="sample-list__heading">
        {title} <span className="sample-list__total">{total(cards)}</span>
      </h3>
      <ul className="sample-list__cards">
        {cards.map((card) => (
          <li key={card.name} className="sample-list__card">
            <span className="sample-list__count">{card.count}</span>
            <span>{card.name}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SampleList({ list }: { list: SampleListData }) {
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState(false);
  const text = useRef<HTMLTextAreaElement>(null);

  if (list.state === "withheld") {
    return (
      <Panel className="sample-list">
        <p className="sample-list__note">{withheldNote(list)}</p>
      </Panel>
    );
  }

  const main = sorted(list.main);
  const side = list.state === "shown" ? sorted(list.side) : [];
  const what = list.state === "shown" ? "list" : "main deck";
  const copied =
    side.length > 0 ? `${lines(main)}\n\n${lines(side)}` : lines(main);

  const copy = async (): Promise<void> => {
    setStatus("");

    try {
      await navigator.clipboard.writeText(copied);
      setFallback(false);
      setStatus(`Copied the ${what}.`);
    } catch {
      setStatus(
        `The clipboard is not available. The ${what} is selected below, ready to copy.`,
      );
      setFallback(true);
      requestAnimationFrame(() => {
        text.current?.focus();
        text.current?.select();
      });
    }
  };

  return (
    <Panel className="sample-list">
      <p className="sample-list__source">{source(list)}</p>
      <div className="sample-list__actions">
        <Button variant="secondary" onClick={copy}>
          Copy {what}
        </Button>
        <span className="sample-list__status" role="status">
          {status}
        </span>
      </div>
      {fallback && (
        <textarea
          ref={text}
          className="sample-list__text"
          readOnly
          rows={8}
          aria-label={
            list.state === "shown" ? "Sample list as text" : "Main deck as text"
          }
          value={copied}
        />
      )}
      <CardList title="Main deck" cards={main} />
      {list.state === "mainOnly" && (
        <>
          <h3 className="sample-list__heading">Sideboard</h3>
          <p className="sample-list__note">
            Not shown. Fewer than {list.minPlayers} players brought this exact
            75.
          </p>
        </>
      )}
      {side.length > 0 && <CardList title="Sideboard" cards={side} />}
    </Panel>
  );
}
