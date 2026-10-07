import { useState } from "react";
import { ColourPips } from "../../components/ColourPips";
import { Panel } from "../../components/Panel";
import { ShareChange } from "../../components/ShareChange";
import { Skeleton } from "../../components/Skeleton";
import { PAGE_SIZE } from "../../config";
import { formatCount, percent } from "../../format";

function matchesOf(deck) {
  return deck.matchWinRate.wins + deck.matchWinRate.losses;
}

const SORT_VALUES = {
  name: (deck) => deck.name,
  share: (deck) => deck.share.rate,
  players: (deck) => deck.players,
  matches: matchesOf,
  winRate: (deck) => deck.matchWinRate.rate,
};

function sortDecks(decks, key, direction) {
  const read = SORT_VALUES[key];
  const sign = direction === "ascending" ? 1 : -1;

  return [...decks].sort((left, right) => {
    const a = read(left);
    const b = read(right);
    return sign * (typeof a === "string" ? a.localeCompare(b, "en-GB") : a - b);
  });
}

function SortHeader({ column, label, numeric, sort, onSort }) {
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

export function DeckTable({ decks }) {
  const [sort, setSort] = useState({ key: "share", direction: "descending" });

  if (decks.length === 0) {
    return null;
  }

  const onSort = (key) =>
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: key === "name" ? "ascending" : "descending" };
      }
      return {
        key,
        direction:
          current.direction === "ascending" ? "descending" : "ascending",
      };
    });

  const ranks = new Map(decks.map((deck, index) => [deck.id, index + 1]));
  const rows = sortDecks(decks, sort.key, sort.direction);

  return (
    <Panel
      className="deck-table__scroll"
      tabIndex="0"
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
                {deck.name}
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
                {percent(deck.matchWinRate.rate)}
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
