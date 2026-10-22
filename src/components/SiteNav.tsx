import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useTimeWindow } from "../hooks/useTimeWindow";
import "./SiteNav.css";

const PAGES = [
  { path: "/", key: "overview" },
  { path: "/matchups", key: "matchups" },
  { path: "/what-to-play", key: "whatToPlay" },
  { path: "/staples", key: "staples" },
] as const;

export function SiteNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [timeWindow] = useTimeWindow();

  return (
    <nav
      className={["site-nav", className].filter(Boolean).join(" ")}
      aria-label={t("components.siteNav.label")}
    >
      {PAGES.map((page) => (
        <NavLink
          key={page.path}
          className="site-nav__link"
          to={{ pathname: page.path, search: `?window=${timeWindow}` }}
          end={page.path === "/"}
        >
          {t(`components.siteNav.${page.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
