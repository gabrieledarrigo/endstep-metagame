import { ColourPips } from "../../components/ColourPips";
import { ShareChange } from "../../components/ShareChange";
import { Skeleton } from "../../components/Skeleton";
import { FORMAT } from "../../config";

function artSource(cardName) {
  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: cardName,
    version: "art_crop",
  })}`;
}

export function DeckCard({ deck }) {
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
          <div>
            <dt>Share</dt>
            <dd>{(deck.share.rate * 100).toFixed(2)}%</dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>{deck.players.toLocaleString("en-GB")}</dd>
          </div>
          <div>
            <dt>Match win rate</dt>
            <dd>{(deck.matchWinRate.rate * 100).toFixed(1)}%</dd>
          </div>
          <div className="deck__change">
            <dt>Share change</dt>
            <dd>
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
      <div className="skeleton deck__art" />
      <div className="deck__body">
        <div className="deck__top">
          <h3 className="deck__name">
            <Skeleton width={140} height="1.3em" />
          </h3>
          <Skeleton width={57} height={17} />
        </div>
        <dl className="deck__stats">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <dt>
                <Skeleton width="100%" height="2.6em" />
              </dt>
              <dd>
                <Skeleton width="76%" height="1.6em" />
              </dd>
            </div>
          ))}
          <div className="deck__change">
            <dt>
              <Skeleton width={72} height="1.3em" />
            </dt>
            <dd>
              <Skeleton width={86} height="1.6em" />
            </dd>
          </div>
        </dl>
        <p className="deck__keys">
          <Skeleton width="92%" height="2.9em" />
        </p>
      </div>
    </div>
  );
}
