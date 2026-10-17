import type { MatrixDeck } from "../../api/types";
import "./DeckPicker.css";

type DeckPickerProps = {
  decks: MatrixDeck[];
  value: string | null;
  missing?: { slug: string; name: string };
  stacked?: boolean;
  onChange: (slug: string | null) => void;
};

export function DeckPicker({
  decks,
  value,
  missing,
  stacked,
  onChange,
}: DeckPickerProps) {
  return (
    <label
      className={stacked ? "deck-picker deck-picker--stacked" : "deck-picker"}
    >
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
        {!stacked && <option value="">All decks</option>}
        {decks.map((deck) => (
          <option key={deck.slug} value={deck.slug}>
            {deck.name}
          </option>
        ))}
      </select>
    </label>
  );
}
