import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "../../components/Button";
import { PAGE_SIZE } from "../../config";
import { formatCount } from "../../helpers";
import "./SearchResults.css";

type SearchResultsProps = {
  field: ReactNode;
  found?: { term: string; total: number };
  more?: { remaining: number; loading: boolean; onMore: () => void };
  moreError?: string;
  busy?: boolean;
  focus?: string;
  onFocused?: () => void;
  children: ReactNode;
};

export function SearchResults({
  field,
  found,
  more,
  moreError,
  busy,
  focus,
  onFocused,
  children,
}: SearchResultsProps) {
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus === undefined || body.current === null) {
      return;
    }

    const link = [...body.current.querySelectorAll("a")].find(
      (anchor) => anchor.pathname === `/decks/${focus}`,
    );

    if (link === undefined) {
      return;
    }

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
        {found && (
          <p className="search-results__line">
            <b className="search-results__count">
              {formatCount(found.total)} {found.total === 1 ? "deck" : "decks"}
            </b>{" "}
            {found.total === 1 ? "matches" : "match"} {"“"}
            {found.term}
            {"”"}. Search covers deck names and every card in their lists.
          </p>
        )}
        {children}
        {moreError && <p className="search-results__error">{moreError}</p>}
        {more && (
          <Button
            variant="secondary"
            className="search-results__more"
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
