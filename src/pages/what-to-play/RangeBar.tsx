import type { Verdict } from "../../helpers";
import "./RangeBar.css";

type RangeBarProps = {
  low: number;
  high: number;
  rate: number;
  min: number;
  max: number;
  verdict: Verdict;
  className?: string;
};

export function RangeBar({
  low,
  high,
  rate,
  min,
  max,
  verdict,
  className,
}: RangeBarProps) {
  const share = (value: number): string =>
    `${((value / (max - min)) * 100).toFixed(2)}%`;
  const span =
    verdict === "neutral"
      ? "range-bar__span"
      : `range-bar__span range-bar__span--${verdict}`;

  return (
    <span
      className={["range-bar", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <span className="range-bar__mid" style={{ left: share(0.5 - min) }} />
      <span
        className={span}
        style={{ left: share(low - min), width: share(high - low) }}
      />
      <span className="range-bar__dot" style={{ left: share(rate - min) }} />
    </span>
  );
}
