import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import "./ChartFrame.css";

type ChartFrameProps = {
  className?: string;
  children: ReactElement;
};

export function ChartFrame({ className, children }: ChartFrameProps) {
  return (
    <div className={["chart-frame", className].filter(Boolean).join(" ")}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
