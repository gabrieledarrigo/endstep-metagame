import { useParams } from "react-router";
import { PageTitle } from "../../components/PageTitle";

export function DeckPage() {
  const { slug } = useParams();

  return (
    <>
      <PageTitle title="Deck" />
      <p>The page for {slug} is not built yet.</p>
    </>
  );
}
