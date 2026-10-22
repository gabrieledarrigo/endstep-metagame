import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
          name: t("overview.winRateScatter.tooltip.share"),
          value: tooltipShare(point.share),
        },
        {
          key: "players",
          name: t("overview.winRateScatter.tooltip.players"),
          value: formatCount(point.players),
        },
        {
          key: "winRate",
          name: t("overview.winRateScatter.tooltip.winRate"),
          value: winRateText(point.winRate),
        },
        {
          key: "bounds",
          name: t("overview.winRateScatter.tooltip.bounds"),
          value: t("common.range", {
            from: winRateText(point.low),
            to: winRateText(point.high),
          }),
        },
      ]}
      verdict={
        point.id === armed
          ? t("overview.winRateScatter.tooltip.tap")
          : t("overview.winRateScatter.tooltip.click")
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

export function WinRateScatterSkeleton() {
  const { t } = useTranslation();

  return (
    <Panel className="chart-section win-rate" aria-busy="true">
      <h2 className="chart-section__title">
        {t("overview.winRateScatter.heading")}
      </h2>
      <p className="chart-section__note">{t("overview.winRateScatter.note")}</p>

      <Skeleton className="win-rate__frame" width="100%" />
    </Panel>
  );
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
  const { t } = useTranslation();
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
  const leftOutNote = t("overview.winRateScatter.leftOut", {
    count: leftOut,
    needed: DECIDED_NEEDED,
  });
  const note = t("overview.winRateScatter.note");

  if (decks.length === 0) {
    return null;
  }

  if (points.length === 0) {
    return (
      <Panel className="chart-section win-rate">
        <h2 className="chart-section__title">
          {t("overview.winRateScatter.heading")}
        </h2>
        <p className="chart-section__note">{leftOutNote}</p>
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
    <Panel
      className="chart-section win-rate"
      onPointerMove={(event) => {
        if (event.pointerType === "touch" || armed === null) {
          return;
        }

        arming.current = null;
        setArmedMark(null);
      }}
    >
      <h2 className="chart-section__title">
        {t("overview.winRateScatter.heading")}
      </h2>
      <p className="chart-section__note">
        {leftOut > 0
          ? t("overview.winRateScatter.noteWithLeftOut", {
              note,
              leftOut: leftOutNote,
            })
          : note}
      </p>

      <ChartFrame className="win-rate__frame">
        <ScatterChart
          margin={{ top: 28, right: 24, bottom: 20, left: 24 }}
          aria-label={t("overview.winRateScatter.chart")}
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
              value: t("overview.winRateScatter.xAxis"),
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
              value: t("overview.winRateScatter.yAxis"),
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
            name={t("overview.winRateScatter.players")}
          />
          <ReferenceLine
            y={50}
            stroke={CHART_TICK}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            label={{
              value: t("overview.winRateScatter.reference"),
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
