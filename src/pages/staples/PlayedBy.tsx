import type { StapleDeck } from "../../api/types";
import { WindowLink } from "../../components/WindowLink";
import { formatCopies, wholePercent } from "../../helpers";
import "./PlayedBy.css";

type PlayedByProps = {
  id: string;
  hidden: boolean;
  decks: StapleDeck[];
};

export function PlayedBy({ id, hidden, decks }: PlayedByProps) {
  if (decks.length === 0) {
    return (
      <div className="played-by" id={id} hidden={hidden}>
        <p className="played-by__empty">
          No deck plays it in 5% of its lists or more.
        </p>
      </div>
    );
  }

  return (
    <div className="played-by" id={id} hidden={hidden}>
      <p className="played-by__title">Played in {decks.length} of the top 24</p>
      <ul className="played-by__list">
        {decks.map((deck) => (
          <li key={deck.slug} className="played-by__item">
            <WindowLink className="played-by__deck" to={`/decks/${deck.slug}`}>
              {deck.name}
            </WindowLink>
            <span className="played-by__bar" aria-hidden="true">
              <span
                className="played-by__fill"
                style={{ width: `${deck.playRate * 100}%` }}
              />
            </span>
            <span className="played-by__rate">
              {wholePercent(deck.playRate)}
              <span className="visually-hidden"> of its lists, </span>
            </span>
            <span className="played-by__copies">
              {formatCopies(deck.copies)}
            </span>
          </li>
        ))}
      </ul>
      <p className="played-by__note">
        The share of each deck's lists that play it.
      </p>
    </div>
  );
}
