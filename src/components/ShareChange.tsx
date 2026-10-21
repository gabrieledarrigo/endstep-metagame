import { useTranslation } from "react-i18next";
import type { Deck } from "../api/types";
import "./ShareChange.css";

export function ShareChange({ change }: { change: Deck["shareChange"] }) {
  const { t } = useTranslation();
  const { points, reason } = change;

  if (typeof points !== "number") {
    return (
      <span className="delta delta--unavailable">
        {reason
          ? t(`components.shareChange.${reason}`)
          : t("components.shareChange.notAvailable")}
      </span>
    );
  }

  if (points === 0) {
    return (
      <span className="delta delta--unchanged">
        {t("components.shareChange.noChange")}
      </span>
    );
  }

  const size = Math.abs(points);

  return (
    <span className={points < 0 ? "delta delta--down" : "delta delta--up"}>
      <span
        role="img"
        aria-label={
          points < 0
            ? t("components.shareChange.down")
            : t("components.shareChange.up")
        }
      >
        {points < 0 ? "\u25bc" : "\u25b2"}
      </span>{" "}
      {t("components.shareChange.points", {
        points: size < 0.005 ? "<0.01" : size.toFixed(2),
      })}
    </span>
  );
}
