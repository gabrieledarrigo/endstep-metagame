import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { type RankedDeck, axisShare, percent, rangeScale } from "../../helpers";
import { RangeBar } from "./RangeBar";
import "./ExpectedRates.css";

const TICK_STEP = 5;
const MAJOR_TICK = 10;

function noteOf(
  t: TFunction,
  changed: boolean,
  period?: string,
): string | undefined {
  if (changed) {
    return t("whatToPlay.expectedRates.note.changed");
  }

  if (period === undefined) {
    return undefined;
  }

  return t("whatToPlay.expectedRates.note.period", { period });
}

function ExpectedHead({ note }: { note?: string }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="expected__head">
        <h2 className="expected__title">
          {t("whatToPlay.expectedRates.title")}
        </h2>
        {note !== undefined && <span className="expected__note">{note}</span>}
      </div>
      <div className="expected__legend">
        <span className="expected__key">
          <span className="expected__swatch expected__swatch--win" />
          {t("whatToPlay.expectedRates.legend.win")}
        </span>
        <span className="expected__key">
          <span className="expected__swatch" />
          {t("whatToPlay.expectedRates.legend.neutral")}
        </span>
        <span className="expected__key">
          <span className="expected__swatch expected__swatch--loss" />
          {t("whatToPlay.expectedRates.legend.loss")}
        </span>
      </div>
    </>
  );
}

function ticks(first: number, last: number): number[] {
  return Array.from(
    { length: (last - first) / TICK_STEP + 1 },
    (_, index) => first + index * TICK_STEP,
  );
}

function Movement({ places }: { places: number }) {
  const { t } = useTranslation();

  if (places === 0) {
    return <span className="expected__move" />;
  }

  const up = places > 0;
  const count = Math.abs(places);

  return (
    <span
      className={
        up
          ? "expected__move expected__move--up"
          : "expected__move expected__move--down"
      }
    >
      <span aria-hidden="true">
        {up ? "↑" : "↓"}
        {count}
      </span>
      <span className="visually-hidden">
        {up
          ? t("whatToPlay.expectedRates.movement.up", { count })
          : t("whatToPlay.expectedRates.movement.down", { count })}
      </span>
    </span>
  );
}

type ExpectedRatesProps = {
  ranking: RankedDeck[];
  baseline?: RankedDeck[];
  changed?: boolean;
  period?: string;
};

export function ExpectedRates({
  ranking,
  baseline = ranking,
  changed = false,
  period,
}: ExpectedRatesProps) {
  const { t } = useTranslation();
  const { min, max } = rangeScale(ranking);
  const first = Math.round(min * 100);
  const last = Math.round(max * 100);
  const places = new Map(
    baseline.map((entry, index) => [entry.deck.slug, index]),
  );

  return (
    <Panel className="expected">
      <ExpectedHead note={noteOf(t, changed, period)} />
      <div className="expected__axis" aria-hidden="true">
        <span className="expected__gap" />
        <span className="expected__gap" />
        <span className="expected__scale">
          {ticks(first, last).map((tick) => (
            <span
              key={tick}
              className={
                tick % MAJOR_TICK === 0
                  ? "expected__tick"
                  : "expected__tick expected__tick--minor"
              }
              style={{
                left: `${(((tick - first) / (last - first)) * 100).toFixed(2)}%`,
              }}
            >
              {axisShare(tick)}
            </span>
          ))}
        </span>
        <span className="expected__gap" />
        <span className="expected__gap" />
      </div>
      <ol className="expected__list">
        {ranking.map((entry, index) => (
          <li key={entry.deck.slug} className="expected__row">
            <span className="expected__place">{index + 1}</span>
            <WindowLink
              className="expected__deck"
              to={`/decks/${entry.deck.slug}`}
            >
              {entry.deck.name}
            </WindowLink>
            <RangeBar
              className="expected__bar"
              low={entry.low}
              high={entry.high}
              rate={entry.rate}
              min={min}
              max={max}
              verdict={entry.verdict}
            />
            <span className="expected__rate">
              {percent(entry.rate)}
              <span className="visually-hidden">
                {t("whatToPlay.expectedRates.likely", {
                  low: percent(entry.low),
                  high: percent(entry.high),
                })}
              </span>
            </span>
            <Movement places={(places.get(entry.deck.slug) ?? index) - index} />
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function ExpectedRatesSkeleton() {
  return (
    <Panel className="expected" aria-busy="true">
      <ExpectedHead />
      <Skeleton className="expected__skeleton" />
    </Panel>
  );
}
