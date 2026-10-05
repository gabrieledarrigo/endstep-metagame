import "./styles.css";
import { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Customized,
  useXAxisScale,
  useYAxisScale,
  usePlotArea,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";

const FORMAT = "Pauper";
const POPULATION = "rated";
const WINDOWS = ["1d", "7d", "14d", "30d", "season"];
const DEFAULT_WINDOW = "30d";
const PAGE_SIZE = 24;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

function readTimeWindow() {
  const value = new URLSearchParams(location.search).get("window");
  return WINDOWS.includes(value) ? value : DEFAULT_WINDOW;
}

function failure(status) {
  if (status === 429) {
    return {
      kind: "rateLimit",
      message:
        "Endstep's rate limit was reached. The data is cached for five minutes, so a retry usually works.",
    };
  }
  if (status === 502 || status === 504) {
    return { kind: "upstream", message: "Endstep did not respond." };
  }
  return { kind: "http", message: `The request failed with status ${status}.` };
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function getJson(path, params, signal) {
  const url = `/api/metagame/${path}?${new URLSearchParams(params)}`;

  for (let attempt = 0; ; attempt += 1) {
    let response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }
      if (attempt === MAX_RETRIES) {
        throw Object.assign(new Error("The server could not be reached."), {
          kind: "network",
        });
      }
      await wait(RETRY_BASE_MS * 2 ** attempt, signal);
      continue;
    }

    if (response.ok) {
      try {
        return await response.json();
      } catch (error) {
        if (error.name === "AbortError") {
          throw error;
        }
        throw Object.assign(
          new Error("The server returned a malformed response."),
          {
            kind: "malformed",
          },
        );
      }
    }

    const detail = failure(response.status);
    const retryable = response.status === 429 || response.status >= 500;

    if (!retryable || attempt === MAX_RETRIES) {
      throw Object.assign(new Error(detail.message), detail, {
        status: response.status,
      });
    }

    await wait(RETRY_BASE_MS * 2 ** attempt, signal);
  }
}

function timeWindowUrl(value) {
  const url = new URL(location.href);
  url.searchParams.set("window", value);
  return url;
}

function useTimeWindow() {
  const [value, setValue] = useState(readTimeWindow);

  useEffect(() => {
    history.replaceState(null, "", timeWindowUrl(readTimeWindow()));

    const sync = () => setValue(readTimeWindow());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const select = useCallback(
    (next, replace) => {
      if (next === value) {
        return;
      }

      const write = replace ? history.replaceState : history.pushState;
      write.call(history, null, "", timeWindowUrl(next));
      setValue(next);
    },
    [value],
  );

  return [value, select];
}

function fetchDecks(timeWindow, signal) {
  return getJson(
    `${FORMAT}/decks`,
    {
      window: timeWindow,
      population: POPULATION,
      sort: "share",
      dir: "desc",
      page: 1,
      pageSize: PAGE_SIZE,
    },
    signal,
  );
}

function fetchSeries(timeWindow, signal) {
  return getJson(
    `${FORMAT}/share-series`,
    { window: timeWindow, population: POPULATION },
    signal,
  );
}

const LOADING = { status: "loading" };

function useResource(load, timeWindow) {
  const [reloads, setReloads] = useState(0);
  const key = `${timeWindow} ${reloads}`;
  const [state, setState] = useState({ key, ...LOADING });

  if (state.key !== key) {
    setState({ key, ...LOADING });
  }

  useEffect(() => {
    const controller = new AbortController();
    const settle = (next) => {
      setState((current) => (current.key === key ? { key, ...next } : current));
    };

    load(timeWindow, controller.signal)
      .then((data) => settle({ status: "ready", data }))
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        settle({ status: "error", error });
      });

    return () => controller.abort();
  }, [load, timeWindow, key]);

  const retry = useCallback(() => setReloads((count) => count + 1), []);

  return [state.key === key ? state : LOADING, retry];
}

const PIP_FILL = {
  W: "#fffbd5",
  U: "#aae0fa",
  B: "#cbc2bf",
  R: "#f9aa8f",
  G: "#9bd3ae",
  C: "#cac5c0",
};

const PIP_NAME = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colourless",
};

function Panel({ className, children, ...rest }) {
  return (
    <div {...rest} className={["panel", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

function Button({ variant = "primary", className, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={["button", "button--" + variant, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

function ColourPips({ colours }) {
  const known = (colours || []).filter((letter) => letter in PIP_FILL);
  const letters = known.length > 0 ? known : ["C"];

  return (
    <span className="colour-pips">
      <span className="visually-hidden">
        Colours: {letters.map((letter) => PIP_NAME[letter]).join(", ")}
      </span>
      {letters.map((letter, index) => (
        <svg
          key={index}
          className="colour-pips__pip"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="9"
            fill={PIP_FILL[letter]}
            stroke="rgba(11,11,11,.22)"
            strokeWidth="1"
          />
          <text x="10" y="14.3" textAnchor="middle">
            {letter}
          </text>
        </svg>
      ))}
    </span>
  );
}

function SegmentedControl({ label, options, value, onChange, busy }) {
  return (
    <div
      className="segmented"
      role="group"
      aria-label={label}
      data-busy={busy || undefined}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="segmented__option"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function StatTile({ label, value, hero }) {
  return (
    <div className={hero ? "stat-tile stat-tile--hero" : "stat-tile"}>
      <dt className="stat-tile__label">{label}</dt>
      <dd className="stat-tile__value">{value}</dd>
    </div>
  );
}

function Skeleton({ className, width, height }) {
  return (
    <div
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

function artSource(cardName) {
  return `https://endstep.cc/api/cards/image?${new URLSearchParams({
    name: cardName,
    version: "art_crop",
  })}`;
}

const NO_CHANGE = {
  previous_window_empty: "no earlier data",
  no_previous_window: "no earlier window",
};

function ShareChange({ change }) {
  const points = change && change.points;

  if (typeof points !== "number") {
    return (
      <span className="delta delta--unavailable">
        {NO_CHANGE[change && change.reason] || "not available"}
      </span>
    );
  }

  if (points === 0) {
    return <span className="delta delta--unchanged">no change</span>;
  }

  const size = Math.abs(points);

  return (
    <span className={points < 0 ? "delta delta--down" : "delta delta--up"}>
      <span role="img" aria-label={points < 0 ? "down" : "up"}>
        {points < 0 ? "\u25bc" : "\u25b2"}
      </span>{" "}
      {size < 0.005 ? "<0.01" : size.toFixed(2)} pts
    </span>
  );
}

function DeckCard({ deck }) {
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
        <p className="deck__keys">{deck.keyCards.join(" · ")}</p>
      </div>
    </a>
  );
}

function DeckGrid({ decks }) {
  return (
    <section className="deck-grid" aria-labelledby="deck-grid-heading">
      <h2 className="visually-hidden" id="deck-grid-heading">
        Decks by meta share
      </h2>
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </section>
  );
}

function DeckCardSkeleton() {
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

function DeckGridSkeleton() {
  return (
    <div className="deck-grid" aria-busy="true">
      {Array.from({ length: PAGE_SIZE }, (ignored, index) => (
        <DeckCardSkeleton key={index} />
      ))}
    </div>
  );
}

function StatePanel({ title, detail, action, busy }) {
  return (
    <div className="state-panel" aria-busy={busy || undefined}>
      <h2 className="state-panel__title">{title}</h2>
      {detail && <p className="state-panel__detail">{detail}</p>}
      {action}
    </div>
  );
}

function Section({ state, skeleton, title, onRetry, children }) {
  if (state.status === "loading") {
    return skeleton;
  }

  if (state.status === "error") {
    return (
      <StatePanel
        title={title}
        detail={state.error.message}
        action={<Button onClick={onRetry}>Retry</Button>}
      />
    );
  }

  return children(state.data);
}

function EmptyWindow({ timeWindow, onSelect }) {
  const longer = WINDOWS[WINDOWS.indexOf(timeWindow) + 1];

  return (
    <StatePanel
      title="No decks in this window"
      detail={
        longer
          ? `The ${timeWindow} window has no registrations yet. Try a longer window.`
          : `The ${timeWindow} window has no registrations yet.`
      }
      action={
        longer && (
          <Button variant="secondary" onClick={() => onSelect(longer)}>
            Switch to {longer}
          </Button>
        )
      }
    />
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function matchesOf(deck) {
  return deck.matchWinRate.wins + deck.matchWinRate.losses;
}

function percent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

const SORT_VALUES = {
  name: (deck) => deck.name,
  share: (deck) => deck.share.rate,
  players: (deck) => deck.players,
  matches: matchesOf,
  winRate: (deck) => deck.matchWinRate.rate,
};

function sortDecks(decks, key, direction) {
  const read = SORT_VALUES[key];
  const sign = direction === "ascending" ? 1 : -1;

  return [...decks].sort((left, right) => {
    const a = read(left);
    const b = read(right);
    return sign * (typeof a === "string" ? a.localeCompare(b, "en-GB") : a - b);
  });
}

function SortHeader({ column, label, numeric, sort, onSort }) {
  const active = sort.key === column;

  return (
    <th
      scope="col"
      className={
        numeric
          ? "deck-table__header deck-table__header--numeric"
          : "deck-table__header"
      }
      aria-sort={active ? sort.direction : "none"}
    >
      <button
        type="button"
        className="deck-table__sort"
        onClick={() => onSort(column)}
      >
        {label}
        {active && (
          <span className="deck-table__mark" aria-hidden="true">
            {sort.direction === "ascending" ? "\u25b2" : "\u25bc"}
          </span>
        )}
      </button>
    </th>
  );
}

function DeckTable({ decks }) {
  const [sort, setSort] = useState({ key: "share", direction: "descending" });

  if (decks.length === 0) {
    return null;
  }

  const onSort = (key) =>
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: key === "name" ? "ascending" : "descending" };
      }
      return {
        key,
        direction:
          current.direction === "ascending" ? "descending" : "ascending",
      };
    });

  const ranks = new Map(decks.map((deck, index) => [deck.id, index + 1]));
  const rows = sortDecks(decks, sort.key, sort.direction);

  return (
    <Panel
      className="deck-table__scroll"
      tabIndex="0"
      role="region"
      aria-label="Deck table"
    >
      <table className="deck-table">
        <caption className="visually-hidden">
          The top {decks.length} decks, sortable by column
        </caption>
        <thead>
          <tr>
            <th scope="col" className="deck-table__header">
              <span className="visually-hidden">Rank by share</span>
            </th>
            <SortHeader
              column="name"
              label="Deck"
              sort={sort}
              onSort={onSort}
            />
            <th scope="col" className="deck-table__header">
              Colours
            </th>
            <SortHeader
              column="share"
              label="Share"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="players"
              label="Players"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="matches"
              label="Matches"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="winRate"
              label="Match win rate"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <th
              scope="col"
              className="deck-table__header deck-table__header--numeric"
            >
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((deck) => (
            <tr key={deck.id} className="deck-table__row">
              <td className="deck-table__cell deck-table__cell--rank">
                {ranks.get(deck.id)}
              </td>
              <th
                scope="row"
                className="deck-table__cell deck-table__cell--deck"
              >
                {deck.name}
              </th>
              <td className="deck-table__cell">
                <ColourPips colours={deck.colours} />
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {percent(deck.share.rate)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {formatCount(deck.players)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {formatCount(matchesOf(deck))}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {percent(deck.matchWinRate.rate)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                <ShareChange change={deck.shareChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

const DECK_TABLE_COLUMNS = [
  { label: "", width: 18 },
  { label: "Deck", width: 150 },
  { label: "Colours", width: 57 },
  { label: "Share", width: 44, numeric: true },
  { label: "Players", width: 40, numeric: true },
  { label: "Matches", width: 48, numeric: true },
  { label: "Match win rate", width: 44, numeric: true },
  { label: "Change", width: 52, numeric: true },
];

function DeckTableSkeleton() {
  return (
    <Panel className="deck-table__scroll" aria-busy="true">
      <table className="deck-table">
        <thead>
          <tr>
            {DECK_TABLE_COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={
                  column.numeric
                    ? "deck-table__header deck-table__header--numeric"
                    : "deck-table__header"
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PAGE_SIZE }, (ignored, row) => (
            <tr key={row}>
              {DECK_TABLE_COLUMNS.map((column) => (
                <td
                  key={column.label}
                  className={
                    column.numeric
                      ? "deck-table__cell deck-table__cell--numeric"
                      : "deck-table__cell"
                  }
                >
                  <Skeleton
                    className={column.numeric ? "skeleton--end" : undefined}
                    width={column.width}
                    height={23.4}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

const rootTokens = getComputedStyle(document.documentElement);
const token = (name) => rootTokens.getPropertyValue(name).trim();

const SERIES_COLOURS = [
  "--s1",
  "--s2",
  "--s3",
  "--s4",
  "--s5",
  "--s6",
  "--s7",
  "--s8",
].map(token);
const CHART_GRID = token("--rule");
const CHART_BASELINE = token("--baseline");
const CHART_TICK = token("--text-400");
const CHART_SURFACE = token("--surface");

const CHART_AXIS = {
  tickLine: false,
  tick: {
    fill: CHART_TICK,
    fontSize: 12,
    style: { fontVariantNumeric: "tabular-nums" },
  },
  axisLine: { stroke: CHART_BASELINE },
};

const CHART_CARTESIAN_GRID = { stroke: CHART_GRID, vertical: false };

const seriesSlots = new Map();

function seriesColours(keys) {
  const taken = new Set();
  const unplaced = [];

  keys.forEach((key) => {
    const slot = seriesSlots.get(key);
    if (slot === undefined || taken.has(slot)) {
      unplaced.push(key);
    } else {
      taken.add(slot);
    }
  });

  let free = 0;
  unplaced.forEach((key) => {
    while (taken.has(free)) {
      free += 1;
    }
    taken.add(free);
    seriesSlots.set(key, free);
  });

  return new Map(
    keys.map((key) => [key, SERIES_COLOURS[seriesSlots.get(key)]]),
  );
}

function ChartFrame({ aspect = 2.9, height, children }) {
  return (
    <div
      className="chart-frame"
      style={height ? { height } : { aspectRatio: String(aspect) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  formatLabel = String,
  formatValue = String,
}) {
  if (!active || !payload) {
    return null;
  }

  const rows = payload.filter(
    (row) => row.value !== null && row.value !== undefined,
  );
  if (rows.length === 0) {
    return null;
  }

  rows.sort((a, b) => b.value - a.value);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__day">{formatLabel(label)}</div>
      {rows.map((row) => (
        <div className="chart-tooltip__row" key={row.dataKey}>
          <span
            className="chart-tooltip__swatch"
            style={{ background: row.color }}
          />
          <span className="chart-tooltip__name">{row.name}</span>
          <span className="chart-tooltip__value">{formatValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ items, hidden, onToggle }) {
  return (
    <div className="chart-legend">
      {items.map((item) => {
        const off = hidden.has(item.key);

        return (
          <button
            key={item.key}
            type="button"
            className={
              off
                ? "chart-legend__item chart-legend__item--off"
                : "chart-legend__item"
            }
            aria-pressed={!off}
            onClick={() => onToggle(item.key)}
          >
            <span
              className="chart-legend__swatch"
              style={{ background: item.colour }}
            />
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

function formatCount(value) {
  return value.toLocaleString("en-GB");
}

function shareRows(series) {
  const byDay = new Map();

  series.forEach((item) => {
    item.points.forEach((point) => {
      const row = byDay.get(point.day) || { day: point.day };
      row[item.deck.id] = point.rate === null ? null : point.rate * 100;
      byDay.set(point.day, row);
    });
  });

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

const shortDay = (day) => day.slice(5);
const axisShare = (share) => `${share}%`;
const tooltipShare = (share) => `${share.toFixed(2)}%`;
const longDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const END_LABEL_OFFSET = 10;
const END_LABEL_GAP = 16;
const END_LABEL_CHAR_WIDTH = 8;

function endLabelGutter(series) {
  const longest = series.reduce(
    (width, item) => Math.max(width, item.deck.name.length),
    0,
  );

  return END_LABEL_OFFSET + longest * END_LABEL_CHAR_WIDTH;
}

function seriesEnd(item) {
  const last = item.points.findLast((point) => point.rate !== null);
  if (!last) {
    return null;
  }

  return {
    key: item.deck.id,
    name: item.deck.name,
    day: last.day,
    share: last.rate * 100,
  };
}

function stackEnds(ends, bottom) {
  const placed = [...ends].sort((a, b) => a.y - b.y);

  let previous = -Infinity;
  placed.forEach((end) => {
    end.labelY = Math.max(end.y, previous + END_LABEL_GAP);
    previous = end.labelY;
  });

  const overflow = previous - bottom;
  if (overflow > 0) {
    placed.forEach((end) => {
      end.labelY -= overflow;
    });
  }

  return placed;
}

function SeriesEnds({ ends }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();

  if (!xScale || !yScale || !plot) {
    return null;
  }

  const centre = xScale.bandwidth ? xScale.bandwidth() / 2 : 0;
  const placed = stackEnds(
    ends.map((end) => ({
      ...end,
      x: xScale(end.day) + centre,
      y: yScale(end.share),
    })),
    plot.y + plot.height,
  );

  return (
    <g aria-hidden="true">
      {placed.map((end) => (
        <g key={end.key}>
          <circle
            cx={end.x}
            cy={end.y}
            r="3.5"
            fill={end.colour}
            stroke={CHART_SURFACE}
            strokeWidth="2"
          />
          <text
            className="share-chart__end"
            x={plot.x + plot.width + END_LABEL_OFFSET}
            y={end.labelY}
            dy="0.32em"
          >
            {end.name}
          </text>
        </g>
      ))}
    </g>
  );
}

const SHARE_LEGEND_WIDTHS = [72, 124, 102, 54, 92, 86, 106, 96];

function ShareOverTimeSkeleton() {
  return (
    <section className="chart-section" aria-busy="true">
      <h2 className="chart-section__title">Share over time</h2>

      <Panel className="share-chart">
        <div className="share-chart__scroll">
          <div
            className="skeleton chart-frame"
            style={{ aspectRatio: "2.9" }}
          />
        </div>

        <div className="chart-legend">
          {SHARE_LEGEND_WIDTHS.map((width) => (
            <Skeleton key={width} width={width} height={20.8} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ShareOverTime({ series }) {
  const [hidden, setHidden] = useState(() => new Set());

  if (series.length === 0) {
    return null;
  }

  const colours = seriesColours(series.map((item) => item.deck.id));
  const rows = shareRows(series);
  const shown = series.filter((item) => !hidden.has(item.deck.id));
  const ends = shown
    .map(seriesEnd)
    .filter(Boolean)
    .map((end) => ({ ...end, colour: colours.get(end.key) }));

  const toggle = (key) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  return (
    <section className="chart-section" aria-labelledby="share-over-time">
      <h2 className="chart-section__title" id="share-over-time">
        Share over time
      </h2>

      <Panel className="share-chart">
        <div
          className="share-chart__scroll"
          tabIndex="0"
          role="region"
          aria-label="Daily meta share, top eight decks"
        >
          <ChartFrame>
            <LineChart
              data={rows}
              margin={{
                top: 8,
                right: endLabelGutter(series),
                bottom: 0,
                left: 0,
              }}
              accessibilityLayer
            >
              <CartesianGrid {...CHART_CARTESIAN_GRID} />
              <XAxis
                dataKey="day"
                tickFormatter={shortDay}
                minTickGap={24}
                {...CHART_AXIS}
              />
              <YAxis tickFormatter={axisShare} width={46} {...CHART_AXIS} />
              <Tooltip
                cursor={{ stroke: CHART_BASELINE }}
                content={
                  <ChartTooltip
                    formatLabel={longDay}
                    formatValue={tooltipShare}
                  />
                }
              />
              {shown.map((item) => (
                <Line
                  key={item.deck.id}
                  type="linear"
                  dataKey={item.deck.id}
                  name={item.deck.name}
                  stroke={colours.get(item.deck.id)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 2, stroke: CHART_SURFACE }}
                  isAnimationActive={false}
                />
              ))}
              <Customized component={<SeriesEnds ends={ends} />} />
            </LineChart>
          </ChartFrame>
        </div>

        <ChartLegend
          items={series.map((item) => ({
            key: item.deck.id,
            name: item.deck.name,
            colour: colours.get(item.deck.id),
          }))}
          hidden={hidden}
          onToggle={toggle}
        />
      </Panel>
    </section>
  );
}

const CHART_BAR = token("--seq-500");
const CHART_RESIDUAL = token("--text-400");
const CHART_LABEL = token("--text-900");
const CHART_NAME = token("--text-600");

function shareBars({ items, total }) {
  const bars = items.map((deck) => ({
    name: deck.name,
    share: deck.share.rate * 100,
    residual: false,
  }));

  const other = 100 - bars.reduce((sum, bar) => sum + bar.share, 0);
  if (other < 0.01) {
    return bars;
  }

  return [
    ...bars,
    {
      name: `Other (${total - items.length} archetypes and unclassified)`,
      share: other,
      residual: true,
    },
  ];
}

const RANKED_BARS_NOTE =
  "Other is a residual, not a deck. It covers every archetype outside the top 24 and the registrations Endstep did not classify.";

function RankedBarsSkeleton() {
  return (
    <section className="panel" aria-busy="true">
      <h2 className="ranked-bars__title">Meta share by deck</h2>

      <div className="ranked-bars__scroll">
        <div className="skeleton chart-frame" style={{ height: 660 }} />
      </div>

      <p className="ranked-bars__note">{RANKED_BARS_NOTE}</p>
    </section>
  );
}

function RankedBars({ decks }) {
  if (decks.items.length === 0) {
    return null;
  }

  const bars = shareBars(decks);
  const axisMax = Math.ceil(Math.max(...bars.map((bar) => bar.share)) / 5) * 5;

  return (
    <section className="panel" aria-labelledby="ranked-bars-heading">
      <h2 className="ranked-bars__title" id="ranked-bars-heading">
        Meta share by deck
      </h2>

      <div
        className="ranked-bars__scroll"
        tabIndex="0"
        role="region"
        aria-label="Meta share by deck, chart"
      >
        <ChartFrame height={660}>
          <BarChart
            data={bars}
            layout="vertical"
            margin={{ top: 4, right: 58, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              {...CHART_CARTESIAN_GRID}
              horizontal={false}
              vertical
            />
            <XAxis
              type="number"
              orientation="top"
              domain={[0, axisMax]}
              tickCount={axisMax / 5 + 1}
              tickFormatter={axisShare}
              height={22}
              {...CHART_AXIS}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={210}
              interval={0}
              {...CHART_AXIS}
              tick={{ ...CHART_AXIS.tick, fill: CHART_NAME }}
            />
            <Bar
              dataKey="share"
              radius={[0, 3, 3, 0]}
              barSize={17}
              isAnimationActive={false}
            >
              {bars.map((bar) => (
                <Cell
                  key={bar.name}
                  fill={bar.residual ? CHART_RESIDUAL : CHART_BAR}
                />
              ))}
              <LabelList
                dataKey="share"
                position="right"
                formatter={tooltipShare}
                fill={CHART_LABEL}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartFrame>
      </div>

      <p className="ranked-bars__note">{RANKED_BARS_NOTE}</p>
    </section>
  );
}

const WIN_RATE_MARK = token("--s1");
const SCATTER_LABEL = token("--text-600");
const LABEL_PLOT_WIDTH = 590;
const LABEL_CHAR_WIDTH = 6.6;
const LABEL_GAP_Y = 0.18;

function winRatePoints(decks) {
  return decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    share: deck.share.rate * 100,
    winRate: deck.matchWinRate.rate * 100,
    low: deck.matchWinRate.low * 100,
    high: deck.matchWinRate.high * 100,
    players: deck.players,
  }));
}

function labelledPoints(points, spanX, spanY) {
  const byShare = [...points].sort((a, b) => b.share - a.share);
  const byWinRate = [...points].sort((a, b) => b.winRate - a.winRate);
  const wanted = [
    ...byShare.slice(0, 3),
    ...byWinRate.slice(0, 2),
    ...byWinRate.slice(-2),
  ];

  const kept = [];
  wanted.forEach((point) => {
    const crowded = kept.some((other) => {
      const names = (point.name.length + other.name.length) / 2;
      const gap = (names * LABEL_CHAR_WIDTH) / LABEL_PLOT_WIDTH;

      return (
        Math.abs(other.share - point.share) / spanX < gap &&
        Math.abs(other.winRate - point.winRate) / spanY < LABEL_GAP_Y
      );
    });
    if (!crowded) {
      kept.push(point);
    }
  });

  return new Set(kept.map((point) => point.id));
}

function WinRateMark({ cx, cy, size, payload, labelled }) {
  const radius = Math.sqrt(size / Math.PI);

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={WIN_RATE_MARK}
        fillOpacity={0.55}
        stroke={CHART_SURFACE}
        strokeWidth={2}
      />
      {labelled.has(payload.id) && (
        <text
          className="chart-mark__label"
          x={cx}
          y={cy - radius - 7}
          textAnchor="middle"
        >
          {payload.name}
        </text>
      )}
    </g>
  );
}

const winRateText = (value) => `${value.toFixed(1)}%`;

function WinRateTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{point.name}</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__name">Meta share</span>
        <span className="chart-tooltip__value">
          {tooltipShare(point.share)}
        </span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__name">Players</span>
        <span className="chart-tooltip__value">
          {formatCount(point.players)}
        </span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__name">Match win rate</span>
        <span className="chart-tooltip__value">
          {winRateText(point.winRate)}
        </span>
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__name">Confidence bounds</span>
        <span className="chart-tooltip__value">
          {winRateText(point.low)} to {winRateText(point.high)}
        </span>
      </div>
    </div>
  );
}

function axisTicks(min, max, step) {
  const ticks = [];
  for (let tick = min; tick <= max; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

const WIN_RATE_NOTE =
  "Bubble area is player count. Decks above the line win more than half their matches. The tooltip carries the confidence bounds, and small gaps between decks sit inside them.";

function WinRateScatterSkeleton() {
  return (
    <Panel className="chart-section" aria-busy="true">
      <h2 className="chart-section__title">Win rate against share</h2>
      <p className="chart-section__note">{WIN_RATE_NOTE}</p>

      <div className="skeleton chart-frame" style={{ aspectRatio: "2.4" }} />
    </Panel>
  );
}

function WinRateScatter({ decks }) {
  if (decks.length === 0) {
    return null;
  }

  const points = winRatePoints(decks);
  const rates = points.map((point) => point.winRate);
  const shareMax =
    Math.ceil((Math.max(...points.map((point) => point.share)) + 1) / 2) * 2;
  const rateMin = Math.min(
    45,
    Math.max(0, Math.floor((Math.min(...rates) - 1) / 5) * 5),
  );
  const rateMax = Math.max(
    55,
    Math.min(100, Math.ceil((Math.max(...rates) + 1) / 5) * 5),
  );
  const labelled = labelledPoints(points, shareMax, rateMax - rateMin);

  return (
    <Panel className="chart-section">
      <h2 className="chart-section__title">Win rate against share</h2>
      <p className="chart-section__note">{WIN_RATE_NOTE}</p>

      <ChartFrame aspect={2.4}>
        <ScatterChart
          margin={{ top: 28, right: 24, bottom: 20, left: 24 }}
          aria-label="Match win rate against meta share"
          accessibilityLayer
        >
          <CartesianGrid {...CHART_CARTESIAN_GRID} />
          <XAxis
            type="number"
            dataKey="share"
            domain={[0, shareMax]}
            ticks={axisTicks(0, shareMax, 2)}
            tickFormatter={axisShare}
            label={{
              value: "meta share",
              position: "insideBottom",
              offset: -14,
              fill: CHART_TICK,
              fontSize: 12,
            }}
            {...CHART_AXIS}
          />
          <YAxis
            type="number"
            dataKey="winRate"
            domain={[rateMin, rateMax]}
            ticks={axisTicks(rateMin, rateMax, 5)}
            tickFormatter={axisShare}
            width={46}
            label={{
              value: "match win rate",
              position: "top",
              offset: 14,
              fill: CHART_TICK,
              fontSize: 12,
            }}
            {...CHART_AXIS}
          />
          <ZAxis
            type="number"
            dataKey="players"
            domain={[0, "dataMax"]}
            range={[0, 1020]}
            name="Players"
          />
          <ReferenceLine
            y={50}
            stroke={CHART_TICK}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            label={{
              value: "50% win rate",
              position: "insideBottomRight",
              fill: SCATTER_LABEL,
              fontSize: 12,
            }}
          />
          <Tooltip
            cursor={{ stroke: CHART_BASELINE, strokeDasharray: "3 3" }}
            content={<WinRateTooltip />}
          />
          <Scatter
            data={points}
            shape={(props) => <WinRateMark {...props} labelled={labelled} />}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ChartFrame>
    </Panel>
  );
}

function formatDate(value, withYear) {
  const [year, month, day] = value.split("-").map(Number);
  const head = `${day} ${MONTHS[month - 1]}`;

  return withYear ? `${head} ${year}` : head;
}

function lastCoveredDay(to) {
  const day = new Date(`${to}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);

  return day.toISOString().slice(0, 10);
}

function formatWindow({ from, to }) {
  const last = lastCoveredDay(to);
  const sameYear = from.slice(0, 4) === last.slice(0, 4);

  return `${formatDate(from, !sameYear)} to ${formatDate(last, true)}`;
}

function formatPopulation(population) {
  return population.charAt(0).toUpperCase() + population.slice(1);
}

const SUMMARY_TILES = [
  { label: "Registrations", value: 177 },
  { label: "Players", value: 40 },
  { label: "Archetypes", value: 26 },
  { label: "Window", value: 167 },
  { label: "Population", value: 42 },
];

function SummarySkeleton() {
  return (
    <Panel aria-busy="true">
      <dl className="stat-list">
        {SUMMARY_TILES.map((tile, index) => (
          <div
            key={index}
            className={index === 0 ? "stat-tile stat-tile--hero" : "stat-tile"}
          >
            <dt className="stat-tile__label">{tile.label}</dt>
            <dd className="stat-tile__value">
              <Skeleton
                width={tile.value}
                height={index === 0 ? "1.05em" : "1.6em"}
              />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Summary({ decks }) {
  const { provenance, totals } = decks;

  return (
    <dl className="stat-list">
      <StatTile
        hero
        label="Registrations"
        value={formatCount(totals.registrations)}
      />
      <StatTile label="Players" value={formatCount(totals.players)} />
      <StatTile label="Archetypes" value={formatCount(decks.decks.total)} />
      <StatTile label="Window" value={formatWindow(provenance.window)} />
      <StatTile
        label="Population"
        value={formatPopulation(provenance.population)}
      />
    </dl>
  );
}

function App() {
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [decks, retryDecks] = useResource(fetchDecks, timeWindow);
  const [series, retrySeries] = useResource(fetchSeries, timeWindow);

  const loading = decks.status === "loading" || series.status === "loading";

  return (
    <div className="page">
      <header>
        <div className="page__eyebrow">Endstep</div>
        <h1>Pauper metagame</h1>
      </header>

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
      </div>

      <p className="visually-hidden" role="status">
        {loading ? `Loading the ${timeWindow} window.` : ""}
      </p>

      <Section
        state={decks}
        skeleton={<SummarySkeleton />}
        title="The summary could not be loaded"
        onRetry={retryDecks}
      >
        {(data) => (
          <Panel>
            <Summary decks={data} />
          </Panel>
        )}
      </Section>

      <Section
        state={decks}
        skeleton={<DeckGridSkeleton />}
        title="The deck grid could not be loaded"
        onRetry={retryDecks}
      >
        {(data) =>
          data.decks.items.length === 0 ? (
            <EmptyWindow timeWindow={timeWindow} onSelect={selectTimeWindow} />
          ) : (
            <DeckGrid decks={data.decks.items} />
          )
        }
      </Section>

      <Section
        state={decks}
        skeleton={<DeckTableSkeleton />}
        title="The deck table could not be loaded"
        onRetry={retryDecks}
      >
        {(data) => <DeckTable decks={data.decks.items} />}
      </Section>

      <Section
        state={series}
        skeleton={<ShareOverTimeSkeleton />}
        title="Share over time could not be loaded"
        onRetry={retrySeries}
      >
        {(data) => <ShareOverTime series={data.series} />}
      </Section>

      <Section
        state={decks}
        skeleton={<RankedBarsSkeleton />}
        title="Meta share by deck could not be loaded"
        onRetry={retryDecks}
      >
        {(data) => <RankedBars decks={data.decks} />}
      </Section>

      <Section
        state={decks}
        skeleton={<WinRateScatterSkeleton />}
        title="Win rate against share could not be loaded"
        onRetry={retryDecks}
      >
        {(data) => <WinRateScatter decks={data.decks.items} />}
      </Section>

      <footer>
        Data from <a href="https://endstep.cc/metagame">endstep.cc</a>. This is
        not an official Endstep product.
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
