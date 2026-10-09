import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { fetchDeck } from "../../api/endpoints";
import type { DeckDetail } from "../../api/types";
import { PageTitle } from "../../components/PageTitle";
import { Section } from "../../components/Section";
import { useTimeWindow } from "../../hooks/useTimeWindow";

function deckTitle(deck: UseQueryResult<DeckDetail>, loading: boolean) {
  if (deck.isSuccess) {
    return deck.data.deck.name;
  }

  return loading ? "Loading the deck" : "Deck";
}

export function DeckPage() {
  const { slug = "" } = useParams();
  const [timeWindow] = useTimeWindow();
  const deck = useQuery({
    queryKey: ["deck", slug, timeWindow],
    queryFn: ({ signal }) => fetchDeck(slug, timeWindow, signal),
  });
  const loading = deck.isPending || (deck.isError && deck.isFetching);

  return (
    <>
      <PageTitle title={deckTitle(deck, loading)} loading={loading} />
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
