import type { ReactNode } from "react";
import "./StatTile.css";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hero?: boolean;
};

export function StatTile({ label, value, hero }: StatTileProps) {
  return (
    <div className={hero ? "stat-tile stat-tile--hero" : "stat-tile"}>
      <dt className="stat-tile__label">{label}</dt>
      <dd className="stat-tile__value">{value}</dd>
    </div>
  );
}
