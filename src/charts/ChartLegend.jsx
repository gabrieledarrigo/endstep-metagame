import { Skeleton } from "../components/Skeleton";
import "./ChartLegend.css";

export function ChartLegend({ items, hidden, onToggle }) {
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

export function ChartLegendSkeleton({ widths }) {
  return (
    <div className="chart-legend">
      {widths.map((width) => (
        <Skeleton key={width} width={width} height={20.8} />
      ))}
    </div>
  );
}
