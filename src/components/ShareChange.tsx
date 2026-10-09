import type { Deck } from "../api/types";
import "./ShareChange.css";

const NO_CHANGE: Record<string, string> = {
  previous_window_empty: "no earlier data",
  no_previous_window: "no earlier window",
};

export function ShareChange({ change }: { change: Deck["shareChange"] }) {
  const { points, reason } = change;

  if (typeof points !== "number") {
    return (
      <span className="delta delta--unavailable">
        {(reason && NO_CHANGE[reason]) || "not available"}
      </span>
    );
  }

  if (points === 0) {
    return <span className="delta delta--unchanged">no change</span>;
  }

  const size = Math.abs(points);

  return (
    <span className={points < 0 ? "delta delta--down" : "delta delta--up"}>
      <span role="img" aria-label={points < 0 ? "down" : "up"}>
        {points < 0 ? "\u25bc" : "\u25b2"}
      </span>{" "}
      {size < 0.005 ? "<0.01" : size.toFixed(2)} pts
    </span>
  );
}
