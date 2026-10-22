import { useTranslation } from "react-i18next";
import { PageTitle } from "../../components/PageTitle";
import "./StaplesHead.css";

export function StaplesHead() {
  const { t } = useTranslation();

  return (
    <div className="staples-head">
      <PageTitle title={t("staples.title")} />
      <p className="staples-head__intro">{t("staples.staplesHead.intro")}</p>
    </div>
  );
}
