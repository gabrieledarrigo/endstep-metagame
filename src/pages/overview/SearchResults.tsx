import { type ReactNode, useEffect, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { PAGE_SIZE } from "../../config";
import { formatCount, quoted } from "../../helpers";
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

function Term({ term }: { term: string }) {
  return quoted(term);
}

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
  const { t } = useTranslation();
  const body = useRef<HTMLDivElement>(null);
  const moreHeldFocus = useRef(false);

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
        {found && (
          <p className="search-results__line">
            <Trans
              i18nKey="overview.searchResults.line"
              count={found.total}
              values={{ decks: formatCount(found.total) }}
              components={{
                total: <b className="search-results__count" />,
                term: <Term term={found.term} />,
              }}
            />
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
            {t("overview.searchResults.more", {
              count: Math.min(PAGE_SIZE, more.remaining),
            })}
          </Button>
        )}
      </div>
    </div>
  );
}
