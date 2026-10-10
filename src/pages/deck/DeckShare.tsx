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
  token,
} from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { axisShare, formatDay, longDay, tooltipShare } from "../../format";
import "./DeckShare.css";

const SHARE_LINE = token("--s1");

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
  dates: string;
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
        aria-label={`Daily meta share of ${name}, ${dates}`}
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
          Daily share as a table
        </summary>
        <table className="deck-share__table">
          <thead>
            <tr>
              <th scope="col" className="deck-share__header">
                Day
              </th>
              <th
                scope="col"
                className="deck-share__header deck-share__header--numeric"
              >
                Meta share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.day}>
                <td className="deck-share__cell">{formatDay(row.day)}</td>
                <td className="deck-share__cell deck-share__cell--numeric">
                  {row.share === null ? "no data" : tooltipShare(row.share)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Panel>
  );
}
