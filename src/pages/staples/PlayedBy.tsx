import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  if (decks.length === 0) {
    return (
      <div className="played-by" id={id} hidden={hidden}>
        <p className="played-by__empty">{t("staples.playedBy.empty")}</p>
      </div>
    );
  }

  return (
    <div className="played-by" id={id} hidden={hidden}>
      <p className="played-by__title">
        {t("staples.playedBy.title", { decks: decks.length })}
      </p>
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
              <span className="visually-hidden">
                {t("staples.playedBy.ofLists")}
              </span>
            </span>
            <span className="played-by__copies">
              {formatCopies(deck.copies)}
            </span>
          </li>
        ))}
      </ul>
      <p className="played-by__note">{t("staples.playedBy.note")}</p>
    </div>
  );
}
