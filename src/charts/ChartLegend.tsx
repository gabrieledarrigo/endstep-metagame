import { Skeleton } from "../components/Skeleton";
import "./ChartLegend.css";

type ChartLegendProps = {
  items: {
    key: string;
    name: string;
    colour: string | undefined;
  }[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
};

export function ChartLegend({ items, hidden, onToggle }: ChartLegendProps) {
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

export function ChartLegendSkeleton({ widths }: { widths: number[] }) {
  return (
    <div className="chart-legend">
      {widths.map((width) => (
        <Skeleton key={width} width={width} height={20.8} />
      ))}
    </div>
  );
}
