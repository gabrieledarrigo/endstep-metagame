import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { ChartLink } from "../../charts/ChartLink";
import { ChartTooltip } from "../../charts/ChartTooltip";
import {
  CHART_AXIS,
  CHART_BASELINE,
  CHART_CARTESIAN_GRID,
  CHART_SURFACE,
  CHART_TICK,
} from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import {
  axisShare,
  DECIDED_NEEDED,
  formatCount,
  readRate,
  tooltipShare,
  winRateText,
} from "../../helpers";
import "./WinRateScatter.css";

const WIN_RATE_MARK = "var(--s1)";
const SCATTER_LABEL = "var(--text-600)";
const LABEL_PLOT_WIDTH = 590;
const LABEL_CHAR_WIDTH = 6.6;
const LABEL_GAP_Y = 0.18;
const TAP_CLICK_WINDOW = 1000;

type WinRatePoint = {
  id: string;
  slug: string;
  name: string;
  share: number;
  winRate: number;
  low: number;
  high: number;
  players: number;
};

function winRatePoints(decks: Deck[]): WinRatePoint[] {
  return decks.flatMap((deck) => {
    const read = readRate(deck.matchWinRate);

    if (read.gated) {
      return [];
    }

    return [
      {
        id: deck.id,
        slug: deck.slug,
        name: deck.name,
        share: deck.share.rate * 100,
        winRate: read.rate * 100,
        low: read.low * 100,
        high: read.high * 100,
        players: deck.players,
      },
    ];
  });
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
  armed: boolean;
  onPointerUp: (event: PointerEvent<SVGGElement>) => void;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function WinRateMark({
  cx,
  cy,
  size,
  payload,
  labelled,
  armed,
  onPointerUp,
  onClick,
}: WinRateMarkProps) {
  if (cx === undefined || cy === undefined) {
    return null;
  }

  const radius = Math.sqrt(size / Math.PI);

  return (
    <ChartLink
      to={`/decks/${payload.slug}`}
      label={payload.name}
      onClick={onClick}
    >
      <g
        className={
          armed ? "win-rate__mark win-rate__mark--armed" : "win-rate__mark"
        }
        onPointerUp={onPointerUp}
      >
        <circle
          className="win-rate__dot"
          cx={cx}
          cy={cy}
          r={radius}
          fill={WIN_RATE_MARK}
          fillOpacity="var(--mark-opacity)"
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
    </ChartLink>
  );
}

type WinRateTooltipProps = TooltipContentProps & {
  armed: string | null;
};

function WinRateTooltip({ active, payload, armed }: WinRateTooltipProps) {
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
      verdict={
        point.id === armed
          ? "Tap again to open the deck."
          : "Click to open the deck."
      }
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
  "The bubble area represents player count. Decks above the line win more than half their matches.";

export function WinRateScatterSkeleton() {
  return (
    <Panel className="chart-section win-rate" aria-busy="true">
      <h2 className="chart-section__title">Win rate against share</h2>
      <p className="chart-section__note">{WIN_RATE_NOTE}</p>

      <Skeleton className="win-rate__frame" width="100%" />
    </Panel>
  );
}

function leftOutNote(count: number): string {
  return count === 1
    ? `1 deck with fewer than ${DECIDED_NEEDED} decided matches is left out, too few to place.`
    : `${count} decks with fewer than ${DECIDED_NEEDED} decided matches are left out, too few to place.`;
}

type ArmedMark = {
  id: string;
  decks: Deck[];
};

type Arming = {
  id: string;
  at: number;
};

export function WinRateScatter({ decks }: { decks: Deck[] }) {
  const arming = useRef<Arming | null>(null);
  const [armedMark, setArmedMark] = useState<ArmedMark | null>(null);
  const armed = armedMark?.decks === decks ? armedMark.id : null;

  useEffect(() => {
    if (armed === null) {
      return;
    }

    function disarm(event: Event): void {
      if (
        !(event.target instanceof Element) ||
        event.target.closest(".win-rate__mark") === null
      ) {
        setArmedMark(null);
      }
    }

    document.addEventListener("pointerdown", disarm);

    return (): void => document.removeEventListener("pointerdown", disarm);
  }, [armed]);

  const points = winRatePoints(decks);
  const drawn = [...points].sort((a, b) => b.players - a.players);
  const leftOut = decks.length - points.length;

  if (decks.length === 0) {
    return null;
  }

  if (points.length === 0) {
    return (
      <Panel className="chart-section win-rate">
        <h2 className="chart-section__title">Win rate against share</h2>
        <p className="chart-section__note">{leftOutNote(leftOut)}</p>
      </Panel>
    );
  }

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
      <p className="chart-section__note">
        {leftOut > 0
          ? `${WIN_RATE_NOTE} ${leftOutNote(leftOut)}`
          : WIN_RATE_NOTE}
      </p>

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
              pointerEvents: "none",
            }}
          />
          <Tooltip
            cursor={{ stroke: CHART_BASELINE, strokeDasharray: "3 3" }}
            content={(props) => <WinRateTooltip {...props} armed={armed} />}
          />
          <Scatter
            data={drawn}
            shape={({ cx, cy, size, payload }) => (
              <WinRateMark
                cx={cx}
                cy={cy}
                size={size}
                payload={payload}
                labelled={labelled}
                armed={armed === payload.id}
                onPointerUp={(event) => {
                  if (event.pointerType === "touch" && armed !== payload.id) {
                    setArmedMark({ id: payload.id, decks });
                    arming.current = { id: payload.id, at: event.timeStamp };
                  } else {
                    arming.current = null;
                  }
                }}
                onClick={(event) => {
                  const tap = arming.current;
                  arming.current = null;
                  if (
                    tap !== null &&
                    tap.id === payload.id &&
                    event.timeStamp - tap.at < TAP_CLICK_WINDOW
                  ) {
                    event.preventDefault();
                  }
                }}
              />
            )}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ChartFrame>
    </Panel>
  );
}
