import { ButtonLink } from "../../components/Button";
import { StatePanel } from "../../components/StatePanel";
import { FORMAT, SITE_NAME } from "../../config";
import { useTimeWindow } from "../../hooks/useTimeWindow";

const TITLE = "No deck at this address";

export function DeckNotFound({ slug }: { slug: string }) {
  const [timeWindow] = useTimeWindow();

  return (
    <>
      <title>{`${TITLE} · ${SITE_NAME}`}</title>
      <StatePanel
        main
        title={TITLE}
        detail={`Endstep has no ${FORMAT} deck called "${slug}".`}
        action={
          <ButtonLink to={`/?window=${timeWindow}`}>
            Back to the overview
          </ButtonLink>
        }
      />
    </>
  );
}
