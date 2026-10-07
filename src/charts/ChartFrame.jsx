import { ResponsiveContainer } from "recharts";

export function ChartFrame({ aspect = 2.9, height, children }) {
  return (
    <div
      className="chart-frame"
      style={height ? { height } : { aspectRatio: String(aspect) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
