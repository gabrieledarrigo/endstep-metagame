import { Trans, useTranslation } from "react-i18next";
import type { Deck, TimeWindow } from "../../api/types";
import { ButtonLink } from "../../components/Button";
import { ColourPips } from "../../components/ColourPips";
import { PageTitle } from "../../components/PageTitle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { artSource } from "../../helpers";
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
  const { t } = useTranslation();

  return (
    <div className="deck-hero">
      <img
        className="deck-hero__art"
        src={artSource(deck.art)}
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
            label={t("common.timeWindow")}
            options={WINDOWS}
            labels={t("common.window", { returnObjects: true })}
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
          <Trans
            i18nKey="deck.hero.endstep"
            components={{ hidden: <span className="visually-hidden" /> }}
          />
        </ButtonLink>
      </div>
    </div>
  );
}
