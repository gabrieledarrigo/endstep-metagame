import { Link, type LinkProps } from "react-router";
import { useTimeWindow } from "../hooks/useTimeWindow";

type WindowLinkProps = Omit<LinkProps, "to"> & { to: string };

export function WindowLink({ to, ...rest }: WindowLinkProps) {
  const [timeWindow] = useTimeWindow();

  return (
    <Link {...rest} to={{ pathname: to, search: `?window=${timeWindow}` }} />
  );
}
