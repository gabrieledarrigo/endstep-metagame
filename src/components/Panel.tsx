import type { ComponentProps } from "react";
import "./Panel.css";

export function Panel({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div {...rest} className={["panel", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
