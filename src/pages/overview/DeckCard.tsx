import type { Deck } from "../../api/types";
import { ColourPips } from "../../components/ColourPips";
import { ShareChange } from "../../components/ShareChange";
import { Skeleton } from "../../components/Skeleton";
import { FORMAT } from "../../config";
import { formatCount, percent, tooltipShare } from "../../format";
import "./DeckCard.css";

function artSource(cardName: string) {
  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: cardName,
    version: "art_crop",
  })}`;
}

export function DeckCard({ deck }: { deck: Deck }) {
  return (
    <a
      className="deck"
      href={`https://endstep.cc/metagame/${FORMAT}/${deck.slug}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`${deck.name}, on endstep.cc in a new tab`}
    >
      <img
        className="deck__art"
        src={artSource(deck.art.cardName)}
        alt={deck.art.cardName}
        loading="lazy"
        width="626"
        height="300"
      />
      <div className="deck__body">
        <div className="deck__top">
          <h3 className="deck__name">{deck.name}</h3>
          <ColourPips colours={deck.colours} />
        </div>
        <dl className="deck__stats">
          <div className="deck__stat">
            <dt className="deck__label">Share</dt>
            <dd className="deck__value">
              {tooltipShare(deck.share.rate * 100)}
            </dd>
          </div>
          <div className="deck__stat">
            <dt className="deck__label">Players</dt>
            <dd className="deck__value">{formatCount(deck.players)}</dd>
          </div>
          <div className="deck__stat">
            <dt className="deck__label">Match win rate</dt>
            <dd className="deck__value">{percent(deck.matchWinRate.rate)}</dd>
          </div>
          <div className="deck__stat deck__stat--change">
            <dt className="deck__label">Share change</dt>
            <dd className="deck__value">
              <ShareChange change={deck.shareChange} />
            </dd>
          </div>
        </dl>
        <p className="deck__keys">{deck.keyCards.join("\u00a0· ")}</p>
      </div>
    </a>
  );
}

export function DeckCardSkeleton() {
  return (
    <div className="deck">
      <Skeleton className="deck__art" />
      <div className="deck__body">
        <div className="deck__top">
          <div className="deck__name">
            <Skeleton width={140} height="1.3em" />
          </div>
          <Skeleton width={57} height={17} />
        </div>
        <dl className="deck__stats">
          {[0, 1, 2].map((index) => (
            <div key={index} className="deck__stat">
              <dt className="deck__label">
                <Skeleton width="100%" height="2.6em" />
              </dt>
              <dd className="deck__value">
                <Skeleton width="76%" height="1.6em" />
              </dd>
            </div>
          ))}
          <div className="deck__stat deck__stat--change">
            <dt className="deck__label">
              <Skeleton width={72} height="1.3em" />
            </dt>
            <dd className="deck__value">
              <Skeleton width={86} height="1.6em" />
            </dd>
          </div>
        </dl>
        <div className="deck__keys">
          <Skeleton width="92%" height="2.9em" />
        </div>
      </div>
    </div>
  );
}
