import { type RefObject, useCallback, useEffect, useId, useState } from "react";
import { searchTerm } from "../../helpers";
import "./DeckSearch.css";

const DELAY_MS = 300;

type DeckSearchProps = {
  term: string | null;
  onSearch: (term: string | null) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function DeckSearch({ term, onSearch, inputRef }: DeckSearchProps) {
  const id = useId();
  const [text, setText] = useState(term ?? "");
  const [shownTerm, setShownTerm] = useState(term);
  const [sentTerm, setSentTerm] = useState(term);

  if (term !== shownTerm) {
    setShownTerm(term);
    if (term !== sentTerm) {
      setSentTerm(term);
      if (searchTerm(text) === shownTerm) {
        setText(term ?? "");
      }
    }
  }

  const send = useCallback(
    (next: string | null): void => {
      setSentTerm(next);
      onSearch(next);
    },
    [onSearch],
  );

  useEffect(() => {
    const next = searchTerm(text);

    if (next === term) {
      return;
    }

    const timer = setTimeout(() => send(next), DELAY_MS);

    return (): void => clearTimeout(timer);
  }, [text, term, send]);

  const clear = (): void => {
    setText("");
    send(null);
    inputRef.current?.focus();
  };

  return (
    <div className="deck-search" role="search">
      <label className="visually-hidden" htmlFor={id}>
        Search decks or cards
      </label>
      <svg className="deck-search__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 20 20" />
      </svg>
      <input
        ref={inputRef}
        className="deck-search__input"
        id={id}
        type="search"
        value={text}
        placeholder="Search decks or cards"
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || text === "") {
            return;
          }

          event.preventDefault();
          clear();
        }}
      />
      {text !== "" && (
        <button
          type="button"
          className="deck-search__clear"
          aria-label="Clear the search"
          onClick={clear}
        >
          {"×"}
        </button>
      )}
    </div>
  );
}
