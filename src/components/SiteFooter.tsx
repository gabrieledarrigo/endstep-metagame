import { Trans } from "react-i18next";
import { SITE_NAME } from "../config";
import { SiteMark } from "./SiteMark";
import "./SiteFooter.css";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__site">
        <span className="site-footer__name">
          <SiteMark />
          {SITE_NAME}
        </span>
        <span>
          <Trans
            i18nKey="components.siteFooter.credit"
            components={{
              author: <a href="https://github.com/gabrieledarrigo" />,
              repo: (
                <a href="https://github.com/gabrieledarrigo/pauper-endstep-metagame" />
              ),
            }}
          />
        </span>
      </div>
      <div className="site-footer__notes">
        <p className="site-footer__data">
          <Trans
            i18nKey="components.siteFooter.data"
            components={{
              endstep: <a href="https://endstep.cc/metagame" />,
              scryfall: <a href="https://scryfall.com" />,
            }}
          />
        </p>
        <p className="site-footer__legal">
          {SITE_NAME} is unofficial Fan Content permitted under the{" "}
          <a href="https://company.wizards.com/en/legal/fancontentpolicy">
            Fan Content Policy
          </a>
          . Not approved/endorsed by Wizards. Portions of the materials used are
          property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
      </div>
    </footer>
  );
}
