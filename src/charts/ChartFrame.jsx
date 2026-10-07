import { ResponsiveContainer } from "recharts";
import "./ChartFrame.css";

export function ChartFrame({ className, children }) {
  return (
    <div className={["chart-frame", className].filter(Boolean).join(" ")}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
