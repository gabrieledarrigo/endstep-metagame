import type { CellState } from "../helpers";
import "./MatchupLegend.css";

const ITEMS: { state: CellState; sample: string; label: string }[] = [
  { state: "win", sample: "62", label: "Favoured, clear result" },
  { state: "loss", sample: "38", label: "Unfavoured, clear result" },
  { state: "neutral", sample: "53", label: "Within the range of chance" },
  { state: "gated", sample: "", label: "Too few matches" },
  { state: "none", sample: "·", label: "No data" },
  { state: "mirror", sample: "", label: "Mirror" },
];

export function MatchupLegend({ mirror = true }: { mirror?: boolean }) {
  return (
    <ul className="matchup-legend" aria-label="Legend">
      {ITEMS.filter((item) => mirror || item.state !== "mirror").map((item) => (
        <li key={item.state} className="matchup-legend__item">
          <span
            className={`matchup-legend__swatch matchup-legend__swatch--${item.state}`}
            aria-hidden="true"
          >
            {item.sample}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
