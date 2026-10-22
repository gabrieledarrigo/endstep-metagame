import { useTranslation } from "react-i18next";
import { PageTitle } from "../../components/PageTitle";
import { useCanonicalLink } from "../../hooks/useCanonicalLink";

export function NotFoundPage() {
  const { t } = useTranslation();
  useCanonicalLink(null);

  return <PageTitle title={t("notFound.title")} />;
}
