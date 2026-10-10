import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";
import type { Deck } from "../../api/types";
import { ChartFrame } from "../../charts/ChartFrame";
import { ChartTooltip } from "../../charts/ChartTooltip";
import {
  CHART_AXIS,
  CHART_BASELINE,
  CHART_CARTESIAN_GRID,
  CHART_SURFACE,
  CHART_TICK,
  token,
} from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import {
  axisShare,
  formatCount,
  tooltipShare,
  winRateText,
} from "../../format";
import "./WinRateScatter.css";

const WIN_RATE_MARK = token("--s1");
const SCATTER_LABEL = token("--text-600");
const LABEL_PLOT_WIDTH = 590;
const LABEL_CHAR_WIDTH = 6.6;
const LABEL_GAP_Y = 0.18;

type WinRatePoint = {
  id: string;
  name: string;
  share: number;
  winRate: number;
  low: number;
  high: number;
  players: number;
};

function winRatePoints(decks: Deck[]): WinRatePoint[] {
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

function labelledPoints(
  points: WinRatePoint[],
  spanX: number,
  spanY: number,
): Set<string> {
  const byShare = [...points].sort((a, b) => b.share - a.share);
  const byWinRate = [...points].sort((a, b) => b.winRate - a.winRate);
  const wanted = [
    ...byShare.slice(0, 3),
    ...byWinRate.slice(0, 2),
    ...byWinRate.slice(-2),
  ];

  const kept: WinRatePoint[] = [];
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

type WinRateMarkProps = {
  cx: number | undefined;
  cy: number | undefined;
  size: number;
  payload: WinRatePoint;
  labelled: Set<string>;
};

function WinRateMark({ cx, cy, size, payload, labelled }: WinRateMarkProps) {
  if (cx === undefined || cy === undefined) {
    return null;
  }

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
          className="win-rate__label"
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

function WinRateTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) {
    return null;
  }

  const point: WinRatePoint = payload[0].payload;

  return (
    <ChartTooltip
      title={point.name}
      rows={[
        {
          key: "share",
          name: "Meta share",
          value: tooltipShare(point.share),
        },
        {
          key: "players",
          name: "Players",
          value: formatCount(point.players),
        },
        {
          key: "winRate",
          name: "Match win rate",
          value: winRateText(point.winRate),
        },
        {
          key: "bounds",
          name: "Confidence bounds",
          value: `${winRateText(point.low)} to ${winRateText(point.high)}`,
        },
      ]}
    />
  );
}

function axisTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let tick = min; tick <= max; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

const WIN_RATE_NOTE =
  "Bubble area is player count. Decks above the line win more than half their matches. The tooltip carries the confidence bounds, and small gaps between decks sit inside them.";

export function WinRateScatterSkeleton() {
  return (
    <Panel className="chart-section win-rate" aria-busy="true">
      <h2 className="chart-section__title">Win rate against share</h2>
      <p className="chart-section__note">{WIN_RATE_NOTE}</p>

      <Skeleton className="win-rate__frame" width="100%" />
    </Panel>
  );
}

export function WinRateScatter({ decks }: { decks: Deck[] }) {
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
    <Panel className="chart-section win-rate">
      <h2 className="chart-section__title">Win rate against share</h2>
      <p className="chart-section__note">{WIN_RATE_NOTE}</p>

      <ChartFrame className="win-rate__frame">
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
            content={WinRateTooltip}
          />
          <Scatter
            data={points}
            shape={({ cx, cy, size, payload }) => (
              <WinRateMark
                cx={cx}
                cy={cy}
                size={size}
                payload={payload}
                labelled={labelled}
              />
            )}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ChartFrame>
    </Panel>
  );
}
