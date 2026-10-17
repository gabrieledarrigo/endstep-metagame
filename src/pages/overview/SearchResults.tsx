import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "../../components/Button";
import { PAGE_SIZE } from "../../config";
import { matchText } from "../../helpers";
import "./SearchResults.css";

type SearchResultsProps = {
  field: ReactNode;
  found?: { term: string; total: number };
  more?: { remaining: number; loading: boolean; onMore: () => void };
  note?: string;
  busy?: boolean;
  focus?: string;
  onFocused?: () => void;
  children: ReactNode;
};

export function SearchResults({
  field,
  found,
  more,
  note,
  busy,
  focus,
  onFocused,
  children,
}: SearchResultsProps) {
  const body = useRef<HTMLDivElement>(null);
  const moreHeldFocus = useRef(false);
  const line = found && matchText(found.total, found.term);

  useEffect(() => {
    if (focus === undefined || body.current === null) {
      return;
    }

    if (!moreHeldFocus.current) {
      onFocused?.();
      return;
    }

    const link = [...body.current.querySelectorAll("a")].find(
      (anchor) => anchor.pathname === `/decks/${focus}`,
    );

    if (link === undefined) {
      return;
    }

    moreHeldFocus.current = false;
    link.focus();
    onFocused?.();
  });

  return (
    <div className="search-results">
      {field}
      <div
        ref={body}
        className={busy ? "search-results__body busy" : "search-results__body"}
        aria-busy={busy || undefined}
      >
        {line && (
          <p className="search-results__line">
            <b className="search-results__count">{line.count}</b> {line.rest}{" "}
            Search covers deck names and every card in their lists.
          </p>
        )}
        {children}
        {note && <p className="search-results__note">{note}</p>}
        {more && (
          <Button
            variant="secondary"
            className="search-results__more"
            ref={(button) => (): void => {
              moreHeldFocus.current = document.activeElement === button;
            }}
            aria-busy={more.loading || undefined}
            onClick={() => {
              if (!more.loading) {
                more.onMore();
              }
            }}
          >
            Show {Math.min(PAGE_SIZE, more.remaining)} more
          </Button>
        )}
      </div>
    </div>
  );
}
