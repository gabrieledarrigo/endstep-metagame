import type { ReactNode } from "react";
import "./StatTile.css";

type StatTileProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  hero?: boolean;
  gated?: boolean;
};

export function StatTile({ label, value, detail, hero, gated }: StatTileProps) {
  return (
    <div className={hero ? "stat-tile stat-tile--hero" : "stat-tile"}>
      <dt className="stat-tile__label">{label}</dt>
      <dd
        className={
          gated
            ? "stat-tile__value stat-tile__value--gated"
            : "stat-tile__value"
        }
      >
        {value}
      </dd>
      {detail && <dd className="stat-tile__detail">{detail}</dd>}
    </div>
  );
}
