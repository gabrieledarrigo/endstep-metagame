import { Navigate, Outlet, useLocation } from "react-router";
import { useTimeWindow } from "./hooks/useTimeWindow";

export function Layout() {
  const { pathname, search } = useLocation();
  const [timeWindow] = useTimeWindow();
  const canonical = `?window=${timeWindow}`;

  if (search !== canonical) {
    return <Navigate replace to={{ pathname, search: canonical }} />;
  }

  return (
    <div className="page">
      <header>
        <div className="page__eyebrow">Endstep</div>
        <h1>Pauper metagame</h1>
      </header>

      <Outlet />

      <footer>
        Data from <a href="https://endstep.cc/metagame">endstep.cc</a>. This is
        not an official Endstep product.
      </footer>
    </div>
  );
}
