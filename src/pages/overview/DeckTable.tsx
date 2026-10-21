import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { Deck } from "../../api/types";
import { ColourPips } from "../../components/ColourPips";
import { Panel } from "../../components/Panel";
import { ShareChange } from "../../components/ShareChange";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { PAGE_SIZE } from "../../config";
import { formatCount, formatShare, rateText, readRate } from "../../helpers";
import "./DeckTable.css";

type SortKey = "name" | "share" | "players" | "matches" | "winRate";

type Sort = {
  key: SortKey;
  direction: "ascending" | "descending";
};

function matchesOf(deck: Deck): number {
  return deck.matchWinRate.wins + deck.matchWinRate.losses;
}

const COMPARE: Record<SortKey, (left: Deck, right: Deck) => number> = {
  name: (left, right) => left.name.localeCompare(right.name, "en-GB"),
  share: (left, right) => left.share.rate - right.share.rate,
  players: (left, right) => left.players - right.players,
  matches: (left, right) => matchesOf(left) - matchesOf(right),
  winRate: (left, right) => left.matchWinRate.rate - right.matchWinRate.rate,
};

const DEFAULT_SORT: Sort = { key: "share", direction: "descending" };

function isSortKey(value: string | null): value is SortKey {
  return value !== null && Object.hasOwn(COMPARE, value);
}

function firstDirection(key: SortKey): Sort["direction"] {
  return key === "name" ? "ascending" : "descending";
}

function readSort(params: URLSearchParams): Sort {
  const key = params.get("sort");
  if (!isSortKey(key)) {
    return DEFAULT_SORT;
  }

  const dir = params.get("dir");
  if (dir === "asc") {
    return { key, direction: "ascending" };
  }
  if (dir === "desc") {
    return { key, direction: "descending" };
  }
  return { key, direction: firstDirection(key) };
}

function writeSort(params: URLSearchParams, sort: Sort): URLSearchParams {
  if (
    sort.key === DEFAULT_SORT.key &&
    sort.direction === DEFAULT_SORT.direction
  ) {
    params.delete("sort");
    params.delete("dir");
  } else {
    params.set("sort", sort.key);
    params.set("dir", sort.direction === "ascending" ? "asc" : "desc");
  }

  return params;
}

function isGated(deck: Deck): boolean {
  return readRate(deck.matchWinRate).gated;
}

function sortDecks(decks: Deck[], { key, direction }: Sort): Deck[] {
  const sign = direction === "ascending" ? 1 : -1;

  return [...decks].sort((left, right) => {
    if (key === "winRate" && isGated(left) !== isGated(right)) {
      return isGated(left) ? 1 : -1;
    }

    return sign * COMPARE[key](left, right);
  });
}

type SortHeaderProps = {
  column: SortKey;
  label: string;
  numeric?: boolean;
  sort: Sort;
  onSort: (key: SortKey) => void;
};

function SortHeader({ column, label, numeric, sort, onSort }: SortHeaderProps) {
  const active = sort.key === column;

  return (
    <th
      scope="col"
      className={
        numeric
          ? "deck-table__header deck-table__header--numeric"
          : "deck-table__header"
      }
      aria-sort={active ? sort.direction : "none"}
    >
      <button
        type="button"
        className="deck-table__sort"
        onClick={() => onSort(column)}
      >
        {label}
        {active && (
          <span className="deck-table__mark" aria-hidden="true">
            {sort.direction === "ascending" ? "\u25b2" : "\u25bc"}
          </span>
        )}
      </button>
    </th>
  );
}

type DeckTableProps = {
  decks: Deck[];
  caption?: string;
};

export function DeckTable({ decks, caption }: DeckTableProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = readSort(searchParams);

  if (decks.length === 0) {
    return null;
  }

  const onSort = (key: SortKey): void => {
    const next: Sort =
      key === sort.key
        ? {
            key,
            direction:
              sort.direction === "ascending" ? "descending" : "ascending",
          }
        : { key, direction: firstDirection(key) };

    setSearchParams((params) => writeSort(params, next), { replace: true });
  };

  const ranks = new Map(decks.map((deck, index) => [deck.id, index + 1]));
  const rows = sortDecks(decks, sort);

  return (
    <Panel
      className="deck-table__scroll"
      tabIndex={0}
      role="region"
      aria-labelledby="deck-table-heading"
    >
      <h2 className="visually-hidden" id="deck-table-heading">
        {t("overview.deckTable.heading")}
      </h2>
      <table className="deck-table">
        <caption className="visually-hidden">
          {caption ?? t("overview.deckTable.caption", { count: decks.length })}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="deck-table__header">
              <span className="visually-hidden">
                {t("overview.deckTable.rank")}
              </span>
            </th>
            <SortHeader
              column="name"
              label={t("common.deck")}
              sort={sort}
              onSort={onSort}
            />
            <th scope="col" className="deck-table__header">
              {t("overview.deckTable.columns.colours")}
            </th>
            <SortHeader
              column="share"
              label={t("overview.deckTable.columns.share")}
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="players"
              label={t("overview.deckTable.columns.players")}
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="matches"
              label={t("overview.deckTable.columns.matches")}
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="winRate"
              label={t("overview.deckTable.columns.winRate")}
              numeric
              sort={sort}
              onSort={onSort}
            />
            <th
              scope="col"
              className="deck-table__header deck-table__header--numeric"
            >
              {t("overview.deckTable.columns.change")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((deck) => (
            <tr key={deck.id} className="deck-table__row">
              <td className="deck-table__cell deck-table__cell--rank">
                {ranks.get(deck.id)}
              </td>
              <th
                scope="row"
                className="deck-table__cell deck-table__cell--deck"
              >
                <WindowLink
                  className="deck-table__link"
                  to={`/decks/${deck.slug}`}
                >
                  {deck.name}
                </WindowLink>
              </th>
              <td className="deck-table__cell">
                <ColourPips colours={deck.colours} />
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {formatShare(deck.share.rate)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {formatCount(deck.players)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {formatCount(matchesOf(deck))}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                {rateText(deck.matchWinRate)}
              </td>
              <td className="deck-table__cell deck-table__cell--numeric">
                <ShareChange change={deck.shareChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

const DECK_TABLE_COLUMNS = [
  { name: "rank", width: 18, numeric: false },
  { name: "deck", label: "common.deck", width: 150, numeric: false },
  {
    name: "colours",
    label: "overview.deckTable.columns.colours",
    width: 57,
    numeric: false,
  },
  {
    name: "share",
    label: "overview.deckTable.columns.share",
    width: 44,
    numeric: true,
  },
  {
    name: "players",
    label: "overview.deckTable.columns.players",
    width: 40,
    numeric: true,
  },
  {
    name: "matches",
    label: "overview.deckTable.columns.matches",
    width: 48,
    numeric: true,
  },
  {
    name: "winRate",
    label: "overview.deckTable.columns.winRate",
    width: 44,
    numeric: true,
  },
  {
    name: "change",
    label: "overview.deckTable.columns.change",
    width: 52,
    numeric: true,
  },
] as const;

export function DeckTableSkeleton() {
  const { t } = useTranslation();

  return (
    <Panel className="deck-table__scroll" aria-busy="true">
      <table className="deck-table">
        <thead>
          <tr>
            {DECK_TABLE_COLUMNS.map((column) => (
              <th
                key={column.name}
                scope="col"
                className={
                  column.numeric
                    ? "deck-table__header deck-table__header--numeric"
                    : "deck-table__header"
                }
              >
                {"label" in column && t(column.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PAGE_SIZE }, (ignored, row) => (
            <tr key={row}>
              {DECK_TABLE_COLUMNS.map((column) => (
                <td
                  key={column.name}
                  className={
                    column.numeric
                      ? "deck-table__cell deck-table__cell--numeric"
                      : "deck-table__cell"
                  }
                >
                  <Skeleton
                    className={column.numeric ? "skeleton--end" : undefined}
                    width={column.width}
                    height={23.4}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
