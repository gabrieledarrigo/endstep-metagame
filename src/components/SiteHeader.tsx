import { SITE_NAME } from "../config";
import { LanguageSwitch } from "./LanguageSwitch";
import { SiteMark } from "./SiteMark";
import { SiteNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";
import { WindowLink } from "./WindowLink";
import "./SiteHeader.css";

export function SiteHeader() {
  return (
    <header className="site-header">
      <WindowLink className="site-header__brand" to="/">
        <SiteMark className="site-header__mark" />
        {SITE_NAME}
      </WindowLink>
      <SiteNav className="site-header__nav" />
      <div className="site-header__tools">
        <LanguageSwitch />
        <ThemeToggle />
      </div>
    </header>
  );
}
