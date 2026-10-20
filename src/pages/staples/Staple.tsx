import type { Ref } from "react";
import type { StapleCard } from "../../api/types";
import { artSource, coreText, formatCopies, percent } from "../../helpers";
import "./Staple.css";

type StapleProps = {
  card: StapleCard;
  place: number;
  top: number;
  ref?: Ref<HTMLLIElement>;
};

export function Staple({ card, place, top, ref }: StapleProps) {
  return (
    <li className="staple" ref={ref} tabIndex={ref ? -1 : undefined}>
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
        <span className="staple__name">
          <span className="staple__label">{card.name}</span>
        </span>
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
    </li>
  );
}
