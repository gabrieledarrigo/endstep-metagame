import { useCallback } from "react";
import { useParams } from "react-router";
import { fetchDeck } from "../../api/endpoints";
import type { DeckDetail, TimeWindow } from "../../api/types";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { type ResourceState, useResource } from "../../hooks/useResource";
import { useTimeWindow } from "../../hooks/useTimeWindow";

function deckTitle(deck: ResourceState<DeckDetail>) {
  if (deck.status === "ready") {
    return deck.data.deck.name;
  }

  if (deck.status === "loading") {
    return "Loading the deck";
  }

  return "Deck";
}

export function DeckPage() {
  const { slug = "" } = useParams();
  const [timeWindow] = useTimeWindow();
  const load = useCallback(
    (preset: TimeWindow, signal: AbortSignal) =>
      fetchDeck(slug, preset, signal),
    [slug],
  );
  const [deck, retry] = useResource(load, timeWindow);

  return (
    <>
      <PageTitle title={deckTitle(deck)} loading={deck.status === "loading"} />
      <Section
        state={deck}
        skeleton={null}
        title="The deck could not be loaded"
        onRetry={retry}
      >
        {() => <p>The rest of the deck page is not built yet.</p>}
      </Section>
    </>
  );
}
