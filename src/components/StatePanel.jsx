import "./StatePanel.css";

export function StatePanel({ title, detail, action, busy }) {
  return (
    <div className="state-panel" aria-busy={busy || undefined}>
      <h2 className="state-panel__title">{title}</h2>
      {detail && <p className="state-panel__detail">{detail}</p>}
      {action}
    </div>
  );
}
