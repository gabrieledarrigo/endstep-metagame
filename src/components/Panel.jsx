import "./Panel.css";

export function Panel({ className, children, ...rest }) {
  return (
    <div {...rest} className={["panel", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
