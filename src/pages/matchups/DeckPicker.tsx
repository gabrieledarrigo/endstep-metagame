import type { MatrixDeck } from "../../api/types";
import "./DeckPicker.css";

type DeckPickerProps = {
  decks: MatrixDeck[];
  value: string | null;
  missing?: { slug: string; name: string };
  onChange: (slug: string | null) => void;
};

export function DeckPicker({
  decks,
  value,
  missing,
  onChange,
}: DeckPickerProps) {
  return (
    <label className="deck-picker">
      <span className="deck-picker__label">Deck</span>
      <select
        className="deck-picker__select"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {missing && (
          <option value={missing.slug}>
            {missing.name} (not in the top {decks.length})
          </option>
        )}
        <option value="">All decks</option>
        {decks.map((deck) => (
          <option key={deck.slug} value={deck.slug}>
            {deck.name}
          </option>
        ))}
      </select>
    </label>
  );
}
