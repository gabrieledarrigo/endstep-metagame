import { useTranslation } from "react-i18next";
import { PageTitle } from "../../components/PageTitle";

export function NotFoundPage() {
  const { t } = useTranslation();

  return <PageTitle title={t("notFound.title")} />;
}
