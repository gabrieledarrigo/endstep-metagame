import { ButtonLink } from "../../components/Button";
import { StatePanel } from "../../components/StatePanel";
import { FORMAT, SITE_NAME } from "../../config";

const TITLE = "No deck at this address";

export function DeckNotFound({ slug }: { slug: string }) {
  return (
    <>
      <title>{`${TITLE} · ${SITE_NAME}`}</title>
      <StatePanel
        main
        title={TITLE}
        detail={`Endstep has no ${FORMAT} deck called "${slug}".`}
        action={<ButtonLink to="/">Back to the overview</ButtonLink>}
      />
    </>
  );
}
