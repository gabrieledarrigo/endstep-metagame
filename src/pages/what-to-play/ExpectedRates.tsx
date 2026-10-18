import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { type RankedDeck, percent, rangeScale } from "../../helpers";
import { RangeBar } from "./RangeBar";
import "./ExpectedRates.css";

const TICK_STEP = 5;
const MAJOR_TICK = 10;

function ExpectedHead({ period }: { period?: string }) {
  return (
    <>
      <div className="expected__head">
        <h2 className="expected__title">Expected match win rate</h2>
        {period !== undefined && (
          <span className="expected__note">Metagame of {period}</span>
        )}
      </div>
      <div className="expected__legend">
        <span className="expected__key">
          <span className="expected__swatch expected__swatch--win" />
          Clearly above 50%
        </span>
        <span className="expected__key">
          <span className="expected__swatch" />
          Too close to call
        </span>
        <span className="expected__key">
          <span className="expected__swatch expected__swatch--loss" />
          Clearly below 50%
        </span>
      </div>
    </>
  );
}

function ticks(min: number, max: number): number[] {
  const first = Math.round(min * 100);
  const last = Math.round(max * 100);

  return Array.from(
    { length: (last - first) / TICK_STEP + 1 },
    (_, index) => first + index * TICK_STEP,
  );
}

type ExpectedRatesProps = {
  ranking: RankedDeck[];
  period?: string;
};

export function ExpectedRates({ ranking, period }: ExpectedRatesProps) {
  const { min, max } = rangeScale(ranking);
  const span = Math.round(max * 100) - Math.round(min * 100);

  return (
    <Panel className="expected">
      <ExpectedHead period={period} />
      <div className="expected__axis" aria-hidden="true">
        <span className="expected__gap" />
        <span className="expected__gap" />
        <span className="expected__scale">
          {ticks(min, max).map((tick) => (
            <span
              key={tick}
              className={
                tick % MAJOR_TICK === 0
                  ? "expected__tick"
                  : "expected__tick expected__tick--minor"
              }
              style={{
                left: `${(((tick - Math.round(min * 100)) / span) * 100).toFixed(2)}%`,
              }}
            >
              {tick}%
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
                , likely between {percent(entry.low)} and {percent(entry.high)}
              </span>
            </span>
            <span className="expected__move" />
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
