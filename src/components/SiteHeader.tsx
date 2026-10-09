import { SITE_NAME } from "../config";
import { SiteNav } from "./SiteNav";
import { WindowLink } from "./WindowLink";
import "./SiteHeader.css";

export function SiteHeader() {
  return (
    <header className="site-header">
      <WindowLink className="site-header__brand" to="/">
        {SITE_NAME}
      </WindowLink>
      <SiteNav />
    </header>
  );
}
