import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router";
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
  readableSearch,
} from "../../helpers";
import { RangeBar } from "./RangeBar";
import "./Beat.css";

function sentence(
  t: TFunction,
  count: number,
  top: number,
  name: string,
): string {
  if (count === 0) {
    return t("whatToPlay.beat.note.none", { top, name });
  }

  return t("whatToPlay.beat.note.some", { count, name });
}

type BeatTableProps = {
  name: string;
  beating: BeatingDeck[];
  ranking: RankedDeck[];
};

function BeatTable({ name, beating, ranking }: BeatTableProps) {
  const { t } = useTranslation();
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
              {t("common.deck")}
            </th>
            <th scope="col" className="beat__col beat__col--num">
              {t("whatToPlay.beat.table.against", { name })}
            </th>
            <th scope="col" className="beat__col beat__col--bar">
              <span className="visually-hidden">
                {t("whatToPlay.beat.table.range")}
              </span>
            </th>
            <th scope="col" className="beat__col beat__col--num">
              {t("whatToPlay.beat.table.metagame")}
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
                  {t("whatToPlay.beat.table.likely", {
                    low: percent(entry.low),
                    high: percent(entry.high),
                  })}
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const wanted = searchParams.get("beat");
  const chosen =
    (wanted === null ? undefined : findDeck(matrix.decks, wanted)) ??
    matrix.decks[0];
  const beating = decksThatBeat(matrix, chosen.slug);

  const choose = (slug: string | null): void => {
    if (slug === null) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("beat", slug);

    navigate({ search: `?${readableSearch(params)}`, hash }, { replace: true });
  };

  return (
    <Panel className="beat">
      <h2 className="beat__title">{t("whatToPlay.beat.title")}</h2>
      <DeckPicker decks={matrix.decks} value={chosen.slug} onChange={choose} />
      {loadingWindow && beating.length === 0 ? (
        <Skeleton className="beat__skeleton-line" />
      ) : (
        <p className="beat__note">
          {sentence(t, beating.length, matrix.decks.length, chosen.name)}
        </p>
      )}
      {beating.length > 0 && (
        <BeatTable name={chosen.name} beating={beating} ranking={ranking} />
      )}
    </Panel>
  );
}

export function BeatSkeleton() {
  const { t } = useTranslation();

  return (
    <Panel className="beat" aria-busy="true">
      <h2 className="beat__title">{t("whatToPlay.beat.title")}</h2>
      <Skeleton className="beat__skeleton" />
    </Panel>
  );
}
