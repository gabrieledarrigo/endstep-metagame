import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { fetchDeck } from "../../api/endpoints";
import type { DeckDetail } from "../../api/types";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { useTimeWindow } from "../../hooks/useTimeWindow";

function deckTitle(deck: UseQueryResult<DeckDetail>) {
  if (deck.data !== undefined) {
    return deck.data.deck.name;
  }

  if (deck.isError) {
    return "Deck";
  }

  return "Loading the deck";
}

export function DeckPage() {
  const { slug = "" } = useParams();
  const [timeWindow] = useTimeWindow();
  const deck = useQuery({
    queryKey: ["deck", slug, timeWindow],
    queryFn: ({ signal }) => fetchDeck(slug, timeWindow, signal),
  });

  return (
    <>
      <PageTitle title={deckTitle(deck)} loading={deck.isPending} />
      <Section
        query={deck}
        skeleton={null}
        title="The deck could not be loaded"
      >
        {() => <p>The rest of the deck page is not built yet.</p>}
      </Section>
    </>
  );
}
