import { Skeleton } from "../components/Skeleton";
import "./ChartLegend.css";

type ChartLegendProps = {
  items: {
    key: string;
    name: string;
    colour: string | undefined;
  }[];
  pressed: string | null;
  onToggle: (key: string) => void;
};

export function ChartLegend({ items, pressed, onToggle }: ChartLegendProps) {
  return (
    <div className="chart-legend" role="group" aria-label="Highlight a deck">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="chart-legend__item"
          aria-pressed={item.key === pressed}
          onClick={() => onToggle(item.key)}
        >
          <span
            className="chart-legend__swatch"
            style={{ background: item.colour }}
          />
          {item.name}
        </button>
      ))}
    </div>
  );
}

export function ChartLegendSkeleton({ widths }: { widths: number[] }) {
  return (
    <div className="chart-legend">
      {widths.map((width) => (
        <Skeleton key={width} width={width} height={28.8} />
      ))}
    </div>
  );
}
