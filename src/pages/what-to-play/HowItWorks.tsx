import { useTranslation } from "react-i18next";
import { Panel } from "../../components/Panel";
import "./HowItWorks.css";

const ITEMS = ["count", "bars", "pick", "outside"] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <Panel className="how-it-works">
      <h2 className="how-it-works__title">
        {t("whatToPlay.howItWorks.title")}
      </h2>
      {ITEMS.map((item) => (
        <p key={item} className="how-it-works__item">
          <b className="how-it-works__subject">
            {t(`whatToPlay.howItWorks.items.${item}.subject`)}
          </b>{" "}
          {t(`whatToPlay.howItWorks.items.${item}.text`)}
        </p>
      ))}
    </Panel>
  );
}
