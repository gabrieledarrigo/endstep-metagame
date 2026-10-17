import type { MouseEvent, ReactNode } from "react";
import { WindowLink } from "../components/WindowLink";
import "./ChartLink.css";

type ChartLinkProps = {
  to: string;
  label: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function ChartLink({ to, label, onClick, children }: ChartLinkProps) {
  return (
    <WindowLink
      className="chart-link"
      to={to}
      tabIndex={-1}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </WindowLink>
  );
}
