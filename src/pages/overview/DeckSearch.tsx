import {
  type Ref,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { searchTerm } from "../../helpers";
import "./DeckSearch.css";

const DELAY_MS = 300;

export type DeckSearchHandle = {
  clear: () => void;
};

type DeckSearchProps = {
  term: string | null;
  onSearch: (term: string | null) => void;
  ref?: Ref<DeckSearchHandle>;
};

export function DeckSearch({ term, onSearch, ref }: DeckSearchProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(term ?? "");
  const [shownTerm, setShownTerm] = useState(term);
  const [sentTerm, setSentTerm] = useState(term);

  const termChanged = term !== shownTerm;
  const termFromOutside = termChanged && term !== sentTerm;

  if (termChanged) {
    setShownTerm(term);
  }

  if (termFromOutside) {
    setSentTerm(term);
  }

  if (termFromOutside && searchTerm(text) === shownTerm) {
    setText(term ?? "");
  }

  const send = (next: string | null): void => {
    setSentTerm(next);
    onSearch(next);
  };

  const sendAfterPause = useEffectEvent(send);

  useEffect(() => {
    const next = searchTerm(text);

    if (next === term) {
      return;
    }

    const timer = setTimeout(() => sendAfterPause(next), DELAY_MS);

    return (): void => clearTimeout(timer);
  }, [text, term]);

  const clear = (): void => {
    setText("");
    send(null);
    input.current?.focus();
  };

  useImperativeHandle(ref, () => ({ clear }));

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
        ref={input}
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
