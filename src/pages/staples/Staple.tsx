import { type Ref, useId, useState } from "react";
import type { StapleCard } from "../../api/types";
import { artSource, coreText, formatCopies, percent } from "../../helpers";
import { PlayedBy } from "./PlayedBy";
import "./Staple.css";

type StapleProps = {
  card: StapleCard;
  place: number;
  top: number;
  ref?: Ref<HTMLButtonElement>;
};

export function Staple({ card, place, top, ref }: StapleProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <li className="staple">
      <div className="staple__row">
        <span className="staple__place">{place}</span>
        <img
          className="staple__art"
          src={artSource({ cardName: card.name, imageUrl: card.art?.imageUrl })}
          alt=""
          loading="lazy"
          width="120"
          height="88"
        />
        <button
          ref={ref}
          type="button"
          className="staple__name"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <span className="staple__label">{card.name}</span>
          <svg
            className="staple__chevron"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M3.5 6l4.5 4.5L12.5 6" />
          </svg>
        </button>
        <span className="staple__core">{coreText(card.decks)}</span>
        <span className="staple__bar" aria-hidden="true">
          <span
            className="staple__fill"
            style={{ width: `${(card.share / top) * 100}%` }}
          />
        </span>
        <span className="staple__share">
          {percent(card.share)}
          <span className="visually-hidden">, </span>
          <span className="staple__copies">{formatCopies(card.copies)}</span>
        </span>
      </div>
      <PlayedBy id={panelId} hidden={!open} decks={card.decks} />
    </li>
  );
}
