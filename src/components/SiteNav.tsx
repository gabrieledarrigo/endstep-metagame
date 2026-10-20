import { NavLink } from "react-router";
import { useTimeWindow } from "../hooks/useTimeWindow";
import "./SiteNav.css";

const PAGES = [
  { path: "/", label: "Overview" },
  { path: "/matchups", label: "Matchups" },
  { path: "/what-to-play", label: "What to play?" },
  { path: "/staples", label: "Staples" },
];

export function SiteNav({ className }: { className?: string }) {
  const [timeWindow] = useTimeWindow();

  return (
    <nav
      className={["site-nav", className].filter(Boolean).join(" ")}
      aria-label="Pages"
    >
      {PAGES.map((page) => (
        <NavLink
          key={page.path}
          className="site-nav__link"
          to={{ pathname: page.path, search: `?window=${timeWindow}` }}
          end={page.path === "/"}
        >
          {page.label}
        </NavLink>
      ))}
    </nav>
  );
}
