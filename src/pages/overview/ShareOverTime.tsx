import { useState } from "react";
import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  type TooltipContentProps,
} from "recharts";
import type { ShareSeries } from "../../api/types";
import { ChartFrame } from "../../charts/ChartFrame";
import { ChartLegend, ChartLegendSkeleton } from "../../charts/ChartLegend";
import { ChartTooltip } from "../../charts/ChartTooltip";
import { seriesColours } from "../../charts/seriesColours";
import {
  CHART_AXIS,
  CHART_BASELINE,
  CHART_CARTESIAN_GRID,
  CHART_SURFACE,
} from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { axisShare, longDay, shortDay, tooltipShare } from "../../format";
import "./ShareOverTime.css";

type ShareRow = Record<string, string | number | null>;

type SeriesEnd = {
  key: string;
  name: string;
  day: string;
  share: number;
  colour: string | undefined;
};

function shareRows(series: ShareSeries[]) {
  const byDay = new Map<string, ShareRow>();

  series.forEach((item) => {
    item.points.forEach((point) => {
      const row = byDay.get(point.day) || { day: point.day };
      row[item.deck.id] = point.rate === null ? null : point.rate * 100;
      byDay.set(point.day, row);
    });
  });

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

const END_LABEL_OFFSET = 10;
const END_LABEL_GAP = 16;
const END_LABEL_CHAR_WIDTH = 8;

function endLabelGutter(series: ShareSeries[]) {
  const longest = series.reduce(
    (width, item) => Math.max(width, item.deck.name.length),
    0,
  );

  return END_LABEL_OFFSET + longest * END_LABEL_CHAR_WIDTH;
}

function seriesEnd(item: ShareSeries) {
  const last = item.points.findLast((point) => point.rate !== null);
  if (!last || last.rate === null) {
    return null;
  }

  return {
    key: item.deck.id,
    name: item.deck.name,
    day: last.day,
    share: last.rate * 100,
  };
}

function stackEnds<End extends { y: number }>(ends: End[], bottom: number) {
  const placed = [...ends]
    .sort((a, b) => a.y - b.y)
    .map((end) => ({ ...end, labelY: end.y }));

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

function SeriesEnds({ ends }: { ends: SeriesEnd[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();

  if (!xScale || !yScale || !plot) {
    return null;
  }

  const placed = stackEnds(
    ends.flatMap((end) => {
      const x = xScale(end.day, { position: "middle" });
      const y = yScale(end.share);

      return x === undefined || y === undefined ? [] : [{ ...end, x, y }];
    }),
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

function ShareTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active) {
    return null;
  }

  const rows = payload.filter((row) => typeof row.value === "number");
  if (rows.length === 0) {
    return null;
  }

  rows.sort((a, b) => Number(b.value) - Number(a.value));

  return (
    <ChartTooltip
      day={longDay(String(label))}
      rows={rows.map((row) => ({
        key: String(row.dataKey),
        name: String(row.name),
        value: tooltipShare(Number(row.value)),
        colour: row.color,
      }))}
    />
  );
}

const SHARE_LEGEND_WIDTHS = [72, 124, 102, 54, 92, 86, 106, 96];

export function ShareOverTimeSkeleton() {
  return (
    <section className="chart-section" aria-busy="true">
      <h2 className="chart-section__title">Share over time</h2>

      <Panel className="share-chart">
        <div className="share-chart__scroll">
          <Skeleton className="share-chart__frame" width="100%" />
        </div>

        <ChartLegendSkeleton widths={SHARE_LEGEND_WIDTHS} />
      </Panel>
    </section>
  );
}

export function ShareOverTime({ series }: { series: ShareSeries[] }) {
  const [hidden, setHidden] = useState(() => new Set<string>());

  if (series.length === 0) {
    return null;
  }

  const colours = seriesColours(series.map((item) => item.deck.id));
  const rows = shareRows(series);
  const shown = series.filter((item) => !hidden.has(item.deck.id));
  const ends = shown.flatMap((item) => {
    const end = seriesEnd(item);
    return end ? [{ ...end, colour: colours.get(end.key) }] : [];
  });

  const toggle = (key: string) =>
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
          tabIndex={0}
          role="region"
          aria-label="Daily meta share, top eight decks"
        >
          <ChartFrame className="share-chart__frame">
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
                content={ShareTooltip}
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
