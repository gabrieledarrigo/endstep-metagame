import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "../../charts/ChartFrame";
import { CHART_AXIS, CHART_CARTESIAN_GRID, token } from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { axisShare, tooltipShare } from "../../format";

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

export function RankedBarsSkeleton() {
  return (
    <section aria-busy="true">
      <Panel>
        <h2 className="ranked-bars__title">Meta share by deck</h2>

        <div className="ranked-bars__scroll">
          <Skeleton className="ranked-bars__frame" width="100%" />
        </div>

        <p className="ranked-bars__note">{RANKED_BARS_NOTE}</p>
      </Panel>
    </section>
  );
}

export function RankedBars({ decks }) {
  if (decks.items.length === 0) {
    return null;
  }

  const bars = shareBars(decks);
  const axisMax = Math.ceil(Math.max(...bars.map((bar) => bar.share)) / 5) * 5;

  return (
    <section aria-labelledby="ranked-bars-heading">
      <Panel>
        <h2 className="ranked-bars__title" id="ranked-bars-heading">
          Meta share by deck
        </h2>

        <div
          className="ranked-bars__scroll"
          tabIndex="0"
          role="region"
          aria-label="Meta share by deck, chart"
        >
          <ChartFrame className="ranked-bars__frame">
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
      </Panel>
    </section>
  );
}
