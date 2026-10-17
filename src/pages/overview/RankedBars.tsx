import { type PointerEvent, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Text,
  type TextProps,
  XAxis,
  YAxis,
  useChartWidth,
  usePlotArea,
} from "recharts";
import type { Deck, Page } from "../../api/types";
import { ChartFrame } from "../../charts/ChartFrame";
import { ChartLink } from "../../charts/ChartLink";
import { CHART_AXIS, CHART_CARTESIAN_GRID } from "../../charts/theme";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { PAGE_SIZE } from "../../config";
import { axisShare, tooltipShare } from "../../helpers";
import "./RankedBars.css";

const CHART_BAR = "var(--seq-500)";
const CHART_BAR_POINTED = "var(--seq-600)";
const CHART_RESIDUAL = "var(--text-400)";
const CHART_LABEL = "var(--text-900)";
const CHART_NAME = { fill: "var(--text-600)" };
const CHART_NAME_POINTED = {
  fill: "var(--text-900)",
  textDecoration: "underline",
};

type ShareBar = {
  name: string;
  slug: string | null;
  share: number;
};

function shareBars({ items, total }: Page<Deck>): ShareBar[] {
  const bars = items.map((deck) => ({
    name: deck.name,
    slug: deck.slug,
    share: deck.share.rate * 100,
  }));

  const other = 100 - bars.reduce((sum, bar) => sum + bar.share, 0);
  if (other < 0.01) {
    return bars;
  }

  return [
    ...bars,
    {
      name: `Other (${total - items.length} archetypes and unclassified)`,
      slug: null,
      share: other,
    },
  ];
}

function barFill(bar: ShareBar, pointed: string | null): string {
  if (bar.slug === null) {
    return CHART_RESIDUAL;
  }

  if (bar.slug === pointed) {
    return CHART_BAR_POINTED;
  }

  return CHART_BAR;
}

type DeckTickProps = TextProps & {
  payload: { value: string; index: number; coordinate: number };
  bars: ShareBar[];
  pointed: string | null;
  onPoint: (slug: string | null) => void;
};

function DeckTick({ payload, bars, pointed, onPoint, ...text }: DeckTickProps) {
  const plot = usePlotArea();
  const width = useChartWidth();
  const bar: ShareBar | undefined = bars[payload.index];
  const slug = bar?.name === payload.value ? bar.slug : null;
  const look =
    slug !== null && slug === pointed ? CHART_NAME_POINTED : CHART_NAME;
  const name = (
    <Text {...text} {...CHART_AXIS.tick} {...look}>
      {payload.value}
    </Text>
  );

  if (slug === null || plot === undefined || width === undefined) {
    return name;
  }

  const band = plot.height / bars.length;

  return (
    <ChartLink to={`/decks/${slug}`} label={payload.value}>
      <g
        onPointerMove={(event: PointerEvent<SVGGElement>) => {
          if (event.pointerType === "touch") {
            return;
          }

          onPoint(slug);
        }}
        onPointerLeave={() => onPoint(null)}
      >
        <rect
          x={0}
          y={payload.coordinate - band / 2}
          width={width}
          height={band}
          fill="transparent"
        />
        {name}
      </g>
    </ChartLink>
  );
}

const RANKED_BARS_NOTE = `Other covers every archetype outside the top ${PAGE_SIZE}.`;

export function RankedBarsSkeleton() {
  return (
    <section className="ranked-bars" aria-busy="true">
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

type PointedRow = {
  slug: string;
  decks: Page<Deck>;
};

export function RankedBars({ decks }: { decks: Page<Deck> }) {
  const [pointedRow, setPointedRow] = useState<PointedRow | null>(null);
  const pointed = pointedRow?.decks === decks ? pointedRow.slug : null;

  if (decks.items.length === 0) {
    return null;
  }

  const point = (slug: string | null): void => {
    if (slug === null) {
      setPointedRow(null);
      return;
    }

    setPointedRow((previous) =>
      previous?.slug === slug && previous.decks === decks
        ? previous
        : { slug, decks },
    );
  };

  const bars = shareBars(decks);
  const axisMax = Math.ceil(Math.max(...bars.map((bar) => bar.share)) / 5) * 5;

  return (
    <section className="ranked-bars" aria-labelledby="ranked-bars-heading">
      <Panel>
        <h2 className="ranked-bars__title" id="ranked-bars-heading">
          Meta share by deck
        </h2>

        <div
          className="ranked-bars__scroll"
          tabIndex={0}
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
                tick={(props) => (
                  <DeckTick
                    {...props}
                    bars={bars}
                    pointed={pointed}
                    onPoint={point}
                  />
                )}
              />
              <Bar
                dataKey="share"
                radius={[0, 3, 3, 0]}
                barSize={17}
                isAnimationActive={false}
              >
                {bars.map((bar) => (
                  <Cell key={bar.name} fill={barFill(bar, pointed)} />
                ))}
                <LabelList
                  dataKey="share"
                  position="right"
                  formatter={(share) => tooltipShare(Number(share))}
                  fill={CHART_LABEL}
                  fontSize={12}
                  pointerEvents="none"
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
