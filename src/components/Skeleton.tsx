import "./Skeleton.css";

type SkeletonProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
};

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
