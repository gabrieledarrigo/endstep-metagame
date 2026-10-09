import { SiteNav } from "./SiteNav";
import { WindowLink } from "./WindowLink";
import "./SiteHeader.css";

export function SiteHeader() {
  return (
    <header className="site-header">
      <WindowLink className="site-header__brand" to="/">
        Pauper metagame
      </WindowLink>
      <SiteNav />
    </header>
  );
}
