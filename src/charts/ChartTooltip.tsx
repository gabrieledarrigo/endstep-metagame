import "./ChartTooltip.css";

type ChartTooltipProps = {
  day?: string;
  title?: string;
  rows: {
    key: string;
    name: string;
    value: string;
    colour?: string;
  }[];
};

export function ChartTooltip({ day, title, rows }: ChartTooltipProps) {
  return (
    <div className="chart-tooltip">
      {day && <div className="chart-tooltip__day">{day}</div>}
      {title && <div className="chart-tooltip__title">{title}</div>}
      {rows.map((row) => (
        <div className="chart-tooltip__row" key={row.key}>
          {row.colour && (
            <span
              className="chart-tooltip__swatch"
              style={{ background: row.colour }}
            />
          )}
          <span className="chart-tooltip__name">{row.name}</span>
          <span className="chart-tooltip__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
