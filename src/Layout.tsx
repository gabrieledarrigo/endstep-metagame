import { Navigate, Outlet, useLocation } from "react-router";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useRouteFocus } from "./hooks/useRouteFocus";
import { readableSearch } from "./helpers";
import { useTimeWindow } from "./hooks/useTimeWindow";

export function Layout() {
  const { pathname, search, hash } = useLocation();
  const [timeWindow] = useTimeWindow();
  const params = new URLSearchParams(search);

  useRouteFocus();

  if (params.get("window") !== timeWindow) {
    params.set("window", timeWindow);
    return (
      <Navigate
        replace
        to={{ pathname, search: `?${readableSearch(params)}`, hash }}
      />
    );
  }

  return (
    <div className="page">
      <SiteHeader />
      <main className="page__main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
