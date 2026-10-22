import { useTranslation } from "react-i18next";
import type { MatrixDeck } from "../api/types";
import "./DeckPicker.css";

type DeckPickerProps = {
  decks: MatrixDeck[];
  value: string | null;
  missing?: { slug: string; name: string };
  allDecks?: boolean;
  stacked?: boolean;
  onChange: (slug: string | null) => void;
};

export function DeckPicker({
  decks,
  value,
  missing,
  allDecks,
  stacked,
  onChange,
}: DeckPickerProps) {
  const { t } = useTranslation();

  return (
    <label
      className={stacked ? "deck-picker deck-picker--stacked" : "deck-picker"}
    >
      <span className="deck-picker__label">{t("common.deck")}</span>
      <select
        className="deck-picker__select"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {missing && (
          <option value={missing.slug}>
            {t("components.deckPicker.missing", {
              deck: missing.name,
              top: decks.length,
            })}
          </option>
        )}
        {allDecks && (
          <option value="">{t("components.deckPicker.allDecks")}</option>
        )}
        {decks.map((deck) => (
          <option key={deck.slug} value={deck.slug}>
            {deck.name}
          </option>
        ))}
      </select>
    </label>
  );
}
