import type { ReactNode } from "react";
import "./StatList.css";

type StatListProps = {
  compact?: boolean;
  children: ReactNode;
};

export function StatList({ compact, children }: StatListProps) {
  return (
    <dl className={compact ? "stat-list stat-list--compact" : "stat-list"}>
      {children}
    </dl>
  );
}
