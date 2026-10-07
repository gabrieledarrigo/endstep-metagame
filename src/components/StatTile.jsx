export function StatTile({ label, value, hero }) {
  return (
    <div className={hero ? "stat-tile stat-tile--hero" : "stat-tile"}>
      <dt className="stat-tile__label">{label}</dt>
      <dd className="stat-tile__value">{value}</dd>
    </div>
  );
}
