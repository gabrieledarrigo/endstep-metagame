import { useSearchParams } from "react-router";
import type { Deck } from "../../api/types";
import { ColourPips } from "../../components/ColourPips";
import { Panel } from "../../components/Panel";
import { ShareChange } from "../../components/ShareChange";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { PAGE_SIZE } from "../../config";
import { formatCount, percent } from "../../format";
import { rateText, readRate } from "../../helpers";
import "./DeckTable.css";

type SortKey = "name" | "share" | "players" | "matches" | "winRate";

type Sort = {
  key: SortKey;
  direction: "ascending" | "descending";
};

function matchesOf(deck: Deck): number {
  return deck.matchWinRate.wins + deck.matchWinRate.losses;
}

function sortableRate(deck: Deck): number {
  const read = readRate(deck.matchWinRate);

  return read.gated ? -1 : read.rate;
}

const COMPARE: Record<SortKey, (left: Deck, right: Deck) => number> = {
  name: (left, right) => left.name.localeCompare(right.name, "en-GB"),
  share: (left, right) => left.share.rate - right.share.rate,
  players: (left, right) => left.players - right.players,
  matches: (left, right) => matchesOf(left) - matchesOf(right),
  winRate: (left, right) => sortableRate(left) - sortableRate(right),
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

function sortDecks(decks: Deck[], { key, direction }: Sort): Deck[] {
  const sign = direction === "ascending" ? 1 : -1;

  return [...decks].sort((left, right) => sign * COMPARE[key](left, right));
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

export function DeckTable({ decks }: { decks: Deck[] }) {
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
      aria-label="Deck table"
    >
      <table className="deck-table">
        <caption className="visually-hidden">
          The top {decks.length} decks, sortable by column
        </caption>
        <thead>
          <tr>
            <th scope="col" className="deck-table__header">
              <span className="visually-hidden">Rank by share</span>
            </th>
            <SortHeader
              column="name"
              label="Deck"
              sort={sort}
              onSort={onSort}
            />
            <th scope="col" className="deck-table__header">
              Colours
            </th>
            <SortHeader
              column="share"
              label="Share"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="players"
              label="Players"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="matches"
              label="Matches"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              column="winRate"
              label="Match win rate"
              numeric
              sort={sort}
              onSort={onSort}
            />
            <th
              scope="col"
              className="deck-table__header deck-table__header--numeric"
            >
              Change
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
                {percent(deck.share.rate)}
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
  { label: "", width: 18 },
  { label: "Deck", width: 150 },
  { label: "Colours", width: 57 },
  { label: "Share", width: 44, numeric: true },
  { label: "Players", width: 40, numeric: true },
  { label: "Matches", width: 48, numeric: true },
  { label: "Match win rate", width: 44, numeric: true },
  { label: "Change", width: 52, numeric: true },
];

export function DeckTableSkeleton() {
  return (
    <Panel className="deck-table__scroll" aria-busy="true">
      <table className="deck-table">
        <thead>
          <tr>
            {DECK_TABLE_COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={
                  column.numeric
                    ? "deck-table__header deck-table__header--numeric"
                    : "deck-table__header"
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PAGE_SIZE }, (ignored, row) => (
            <tr key={row}>
              {DECK_TABLE_COLUMNS.map((column) => (
                <td
                  key={column.label}
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
