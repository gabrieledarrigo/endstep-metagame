import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { SharePoint } from "../../api/types";
import { ChartFrame } from "../../charts/ChartFrame";
import { ChartTooltip } from "../../charts/ChartTooltip";
import {
  CHART_AXIS,
  CHART_BASELINE,
  CHART_CARTESIAN_GRID,
  CHART_SURFACE,
} from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { axisShare, formatDay, longDay, tooltipShare } from "../../helpers";
import "./DeckShare.css";

const SHARE_LINE = "var(--s1)";

type ShareRow = {
  day: string;
  share: number | null;
};

function ShareTooltip({ active, payload, label }: TooltipContentProps) {
  const share = payload[0]?.value;

  if (!active || typeof share !== "number") {
    return null;
  }

  return (
    <ChartTooltip
      day={longDay(String(label))}
      rows={[{ key: "share", name: "Meta share", value: tooltipShare(share) }]}
    />
  );
}

type DeckShareProps = {
  name: string;
  dates?: string;
  points: SharePoint[];
};

export function DeckShare({ name, dates, points }: DeckShareProps) {
  const rows: ShareRow[] = points.map((point) => ({
    day: point.day,
    share: point.rate === null ? null : point.rate * 100,
  }));
  const last = rows.findLast((row) => row.share !== null);

  return (
    <Panel className="deck-share">
      <div
        className="deck-share__scroll"
        tabIndex={0}
        role="region"
        aria-label={`Daily meta share of ${name}${dates ? `, ${dates}` : ""}`}
      >
        <ChartFrame className="deck-share__frame">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 56, bottom: 0, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid {...CHART_CARTESIAN_GRID} />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              minTickGap={24}
              {...CHART_AXIS}
            />
            <YAxis tickFormatter={axisShare} width={46} {...CHART_AXIS} />
            <Tooltip
              cursor={{ stroke: CHART_BASELINE }}
              content={ShareTooltip}
            />
            <Line
              type="linear"
              dataKey="share"
              name="Meta share"
              stroke={SHARE_LINE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 2, stroke: CHART_SURFACE }}
              isAnimationActive={false}
            />
            {last && last.share !== null && (
              <ReferenceDot
                x={last.day}
                y={last.share}
                r={3.5}
                fill={SHARE_LINE}
                stroke={CHART_SURFACE}
                strokeWidth={2}
                label={{
                  value: tooltipShare(last.share),
                  position: "right",
                  className: "deck-share__end",
                }}
              />
            )}
          </LineChart>
        </ChartFrame>
      </div>

      <details className="deck-share__details">
        <summary className="deck-share__summary">
          Daily share, day by day
        </summary>
        <dl className="deck-share__days" aria-label="Meta share by day">
          {rows.map((row) => (
            <div key={row.day} className="deck-share__day">
              <dt className="deck-share__date">{formatDay(row.day)}</dt>
              {row.share === null ? (
                <dd className="deck-share__share deck-share__share--none">
                  no data
                </dd>
              ) : (
                <dd className="deck-share__share">{tooltipShare(row.share)}</dd>
              )}
            </div>
          ))}
        </dl>
      </details>
    </Panel>
  );
}
