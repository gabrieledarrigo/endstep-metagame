import "./Skeleton.css";

export function Skeleton({ className, width, height }) {
  return (
    <div
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
