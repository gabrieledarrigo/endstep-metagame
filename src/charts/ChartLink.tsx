import type { MouseEvent, ReactNode } from "react";
import { useHref, useLinkClickHandler } from "react-router";
import { useTimeWindow } from "../hooks/useTimeWindow";
import "./ChartLink.css";

type ChartLinkProps = {
  to: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function ChartLink({ to, onClick, children }: ChartLinkProps) {
  const [timeWindow] = useTimeWindow();
  const target = { pathname: to, search: `?window=${timeWindow}` };
  const href = useHref(target);
  const follow = useLinkClickHandler(target);

  return (
    <a
      className="chart-link"
      href={href}
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          follow(event);
        }
      }}
    >
      {children}
    </a>
  );
}
