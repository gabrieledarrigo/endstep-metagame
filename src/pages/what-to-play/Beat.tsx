import { useSearchParams } from "react-router";
import type { MatchupMatrix } from "../../api/types";
import { DeckPicker } from "../../components/DeckPicker";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import {
  type BeatingDeck,
  type RankedDeck,
  decksThatBeat,
  findDeck,
  percent,
  rangeScale,
} from "../../helpers";
import { RangeBar } from "./RangeBar";
import "./Beat.css";

function sentence(count: number, top: number, name: string): string {
  if (count === 0) {
    return `No deck in the top ${top} clearly beats ${name} in this window.`;
  }

  if (count === 1) {
    return `This deck clearly beats ${name}.`;
  }

  return `These decks clearly beat ${name}.`;
}

type BeatTableProps = {
  name: string;
  beating: BeatingDeck[];
  ranking: RankedDeck[];
};

function BeatTable({ name, beating, ranking }: BeatTableProps) {
  const { min, max } = rangeScale(beating);
  const expected = Object.fromEntries(
    ranking.map((entry) => [entry.deck.slug, entry.rate]),
  );

  return (
    <div className="beat__scroll">
      <table className="beat__table">
        <thead>
          <tr>
            <th scope="col" className="beat__col">
              Deck
            </th>
            <th scope="col" className="beat__col beat__col--num">
              Against {name}
            </th>
            <th scope="col" className="beat__col beat__col--bar">
              <span className="visually-hidden">Range</span>
            </th>
            <th scope="col" className="beat__col beat__col--num">
              Against the metagame
            </th>
          </tr>
        </thead>
        <tbody>
          {beating.map((entry) => (
            <tr key={entry.deck.slug} className="beat__row">
              <td className="beat__cell">
                <WindowLink
                  className="beat__deck"
                  to={`/decks/${entry.deck.slug}`}
                >
                  {entry.deck.name}
                </WindowLink>
              </td>
              <td className="beat__cell beat__cell--num">
                {percent(entry.rate)}
                <span className="visually-hidden">
                  , likely between {percent(entry.low)} and{" "}
                  {percent(entry.high)}
                </span>
              </td>
              <td className="beat__cell beat__cell--bar">
                <RangeBar
                  low={entry.low}
                  high={entry.high}
                  rate={entry.rate}
                  min={min}
                  max={max}
                  verdict="win"
                />
              </td>
              <td className="beat__cell beat__cell--num">
                {percent(expected[entry.deck.slug])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type BeatProps = {
  matrix: MatchupMatrix;
  ranking: RankedDeck[];
  loadingWindow?: boolean;
};

export function Beat({ matrix, ranking, loadingWindow }: BeatProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = searchParams.get("beat");
  const chosen =
    (wanted === null ? undefined : findDeck(matrix.decks, wanted)) ??
    matrix.decks[0];
  const beating = decksThatBeat(matrix, chosen.slug);

  const choose = (slug: string | null): void => {
    if (slug === null) {
      return;
    }

    setSearchParams(
      (params) => {
        params.set("beat", slug);
        return params;
      },
      { replace: true },
    );
  };

  return (
    <Panel className="beat">
      <h2 className="beat__title">Beat a deck</h2>
      <DeckPicker decks={matrix.decks} value={chosen.slug} onChange={choose} />
      {loadingWindow && beating.length === 0 ? (
        <Skeleton className="beat__skeleton-line" />
      ) : (
        <p className="beat__note">
          {sentence(beating.length, matrix.decks.length, chosen.name)}
        </p>
      )}
      {beating.length > 0 && (
        <BeatTable name={chosen.name} beating={beating} ranking={ranking} />
      )}
    </Panel>
  );
}

export function BeatSkeleton() {
  return (
    <Panel className="beat" aria-busy="true">
      <h2 className="beat__title">Beat a deck</h2>
      <Skeleton className="beat__skeleton" />
    </Panel>
  );
}
