import { Navigate, Outlet, useLocation } from "react-router";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useRouteFocus } from "./hooks/useRouteFocus";
import { useTimeWindow } from "./hooks/useTimeWindow";

export function Layout() {
  const { pathname, search } = useLocation();
  const [timeWindow] = useTimeWindow();
  const canonical = `?window=${timeWindow}`;

  useRouteFocus();

  if (search !== canonical) {
    return <Navigate replace to={{ pathname, search: canonical }} />;
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
