import type { ReactNode } from "react";
import "./StatePanel.css";

type StatePanelProps = {
  title: string;
  detail?: string;
  action?: ReactNode;
  busy?: boolean;
  main?: boolean;
};

export function StatePanel({
  title,
  detail,
  action,
  busy,
  main,
}: StatePanelProps) {
  return (
    <div className="state-panel" aria-busy={busy || undefined}>
      {main ? (
        <h1 className="state-panel__title" tabIndex={-1}>
          {title}
        </h1>
      ) : (
        <h2 className="state-panel__title">{title}</h2>
      )}
      {detail && <p className="state-panel__detail">{detail}</p>}
      {action}
    </div>
  );
}
