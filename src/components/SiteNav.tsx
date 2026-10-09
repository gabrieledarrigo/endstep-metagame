import { NavLink } from "react-router";
import { useTimeWindow } from "../hooks/useTimeWindow";
import "./SiteNav.css";

const PAGES = [
  { path: "/", label: "Overview" },
  { path: "/matchups", label: "Matchups" },
];

export function SiteNav() {
  const [timeWindow] = useTimeWindow();

  return (
    <nav className="site-nav" aria-label="Pages">
      {PAGES.map((page) => (
        <NavLink
          key={page.path}
          className="site-nav__link"
          to={{ pathname: page.path, search: `?window=${timeWindow}` }}
          end
        >
          {page.label}
        </NavLink>
      ))}
    </nav>
  );
}
