import { PAGE_SIZE } from "../../config";
import { DeckCard, DeckCardSkeleton } from "./DeckCard";
import "./DeckGrid.css";

export function DeckGrid({ decks }) {
  return (
    <section className="deck-grid" aria-labelledby="deck-grid-heading">
      <h2 className="visually-hidden" id="deck-grid-heading">
        Decks by meta share
      </h2>
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </section>
  );
}

export function DeckGridSkeleton() {
  return (
    <div className="deck-grid" aria-busy="true">
      {Array.from({ length: PAGE_SIZE }, (ignored, index) => (
        <DeckCardSkeleton key={index} />
      ))}
    </div>
  );
}
