export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel = String,
  formatValue = String,
}) {
  if (!active || !payload) {
    return null;
  }

  const rows = payload.filter(
    (row) => row.value !== null && row.value !== undefined,
  );
  if (rows.length === 0) {
    return null;
  }

  rows.sort((a, b) => b.value - a.value);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__day">{formatLabel(label)}</div>
      {rows.map((row) => (
        <div className="chart-tooltip__row" key={row.dataKey}>
          <span
            className="chart-tooltip__swatch"
            style={{ background: row.color }}
          />
          <span className="chart-tooltip__name">{row.name}</span>
          <span className="chart-tooltip__value">{formatValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
