import { useTranslation } from "react-i18next";
import type { CellState } from "../helpers";
import { MatchupSwatch } from "./MatchupSwatch";
import "./MatchupLegend.css";

const ITEMS: { state: CellState; sample: string }[] = [
  { state: "win", sample: "62" },
  { state: "loss", sample: "38" },
  { state: "neutral", sample: "53" },
  { state: "gated", sample: "" },
  { state: "none", sample: "·" },
  { state: "mirror", sample: "" },
];

export function MatchupLegend({ mirror = true }: { mirror?: boolean }) {
  const { t } = useTranslation();

  return (
    <ul
      className="matchup-legend"
      aria-label={t("components.matchupLegend.label")}
    >
      {ITEMS.filter((item) => mirror || item.state !== "mirror").map((item) => (
        <li key={item.state} className="matchup-legend__item">
          <MatchupSwatch state={item.state} hidden>
            {item.sample}
          </MatchupSwatch>
          {t(`components.matchupLegend.${item.state}`)}
        </li>
      ))}
    </ul>
  );
}
