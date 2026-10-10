import type { Deck, TimeWindow } from "../../api/types";
import { ButtonLink } from "../../components/Button";
import { ColourPips } from "../../components/ColourPips";
import { PageTitle } from "../../components/PageTitle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { artSource } from "../../cardArt";
import { FORMAT, WINDOWS } from "../../config";
import "./DeckHero.css";

type DeckHeroProps = {
  deck: Deck;
  dates?: string;
  timeWindow: TimeWindow;
  onSelect: (next: TimeWindow) => void;
  busy?: boolean;
};

export function DeckHero({
  deck,
  dates,
  timeWindow,
  onSelect,
  busy,
}: DeckHeroProps) {
  return (
    <div className="deck-hero">
      <img
        className="deck-hero__art"
        src={artSource(deck.art.cardName)}
        alt={deck.art.cardName}
        width="626"
        height="300"
      />
      <div className="deck-hero__body">
        <div className="deck-hero__title">
          <PageTitle title={deck.name} hero />
          <ColourPips colours={deck.colours} />
        </div>
        <p className="deck-hero__keys">{deck.keyCards.join(" · ")}</p>
        <div className="deck-hero__controls">
          <SegmentedControl
            label="Time window"
            options={WINDOWS}
            value={timeWindow}
            onChange={onSelect}
            busy={busy}
          />
          {dates && <span className="deck-hero__dates">{dates}</span>}
        </div>
        <ButtonLink
          variant="secondary"
          to={`https://endstep.cc/metagame/${FORMAT}/${deck.slug}`}
          target="_blank"
          rel="noopener"
        >
          View on endstep.cc
          <span className="visually-hidden">, opens in a new tab</span>
        </ButtonLink>
      </div>
    </div>
  );
}
