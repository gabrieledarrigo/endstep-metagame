import { useTranslation } from "react-i18next";
import { ButtonLink } from "../../components/Button";
import { StatePanel } from "../../components/StatePanel";
import { FORMAT, SITE_NAME } from "../../config";
import { useTimeWindow } from "../../hooks/useTimeWindow";

export function DeckNotFound({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [timeWindow] = useTimeWindow();
  const title = t("deck.notFound.title");

  return (
    <>
      <title>{`${title} · ${SITE_NAME}`}</title>
      <StatePanel
        main
        title={title}
        detail={t("deck.notFound.detail", { format: FORMAT, slug })}
        action={
          <ButtonLink to={`/?window=${timeWindow}`}>
            {t("deck.notFound.back")}
          </ButtonLink>
        }
      />
    </>
  );
}
