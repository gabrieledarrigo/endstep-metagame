import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MatchupCell, MatchupMatrix, MatrixDeck } from "../api/types";
import { ChartTooltip } from "../charts/ChartTooltip";
import {
  type CellState,
  cellOf,
  cellState,
  cellSummary,
  formatCount,
  neededText,
  percent,
  placeTooltip,
} from "../helpers";
import { WindowLink } from "./WindowLink";
import "./MatchupGrid.css";

type Position = {
  row: number;
  column: number;
};

function cellText(state: CellState, cell: MatchupCell | undefined): string {
  if (state === "none") {
    return "·";
  }

  if (state === "mirror" || cell === undefined || cell.rate === null) {
    return "";
  }

  return String(Math.round(cell.rate * 100));
}

function positionOf(target: EventTarget | null): Position | null {
  const element =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-row]")
      : null;

  if (!element) {
    return null;
  }

  return {
    row: Number(element.dataset.row),
    column: Number(element.dataset.column),
  };
}

function elementAt(
  table: HTMLTableElement | null,
  { row, column }: Position,
): HTMLElement | null {
  return (
    table?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-column="${column}"]`,
    ) ?? null
  );
}

function revealTarget(row: number, column: number): Position | null {
  if (window.matchMedia("(min-width: 1100px)").matches) {
    return row === -1 ? null : { row, column: -1 };
  }

  return column === -1 ? null : { row: -1, column };
}

type MatchupDetailProps = {
  rowName: string;
  columnName: string;
  state: CellState;
  cell: MatchupCell | undefined;
};

function MatchupDetail({
  rowName,
  columnName,
  state,
  cell,
}: MatchupDetailProps) {
  const title = `${rowName} against ${columnName}`;

  if (state === "mirror") {
    return (
      <ChartTooltip
        day={title}
        rows={[]}
        verdict="Mirror match. Endstep does not list it."
      />
    );
  }

  if (cell === undefined) {
    return (
      <ChartTooltip
        day={title}
        rows={[]}
        verdict="No data for this pair in the window."
      />
    );
  }

  const counts = [
    { key: "wins", name: "Wins", value: formatCount(cell.wins) },
    { key: "losses", name: "Losses", value: formatCount(cell.losses) },
  ];

  if (cell.gate !== null) {
    return (
      <ChartTooltip
        day={title}
        rows={counts}
        verdict={`Too few to call: ${neededText(cell.wins + cell.losses, "matches")}.`}
      />
    );
  }

  return (
    <ChartTooltip
      day={title}
      rows={[
        { key: "rate", name: "Match win rate", value: percent(cell.rate) },
        {
          key: "range",
          name: "Range",
          value: `${percent(cell.low)} to ${percent(cell.high)}`,
        },
        ...counts,
        { key: "matches", name: "Matches", value: formatCount(cell.matches) },
      ]}
      verdict={
        state === "neutral"
          ? "Within the range of chance."
          : "Clear result. The range excludes 50%."
      }
    />
  );
}

type MatchupGridProps = {
  rows: MatrixDeck[];
  columns: MatrixDeck[];
  cells: MatchupMatrix["cells"];
  label: string;
  linkRows?: boolean;
  contained?: boolean;
  spotlight?: string;
  reveal?: boolean;
  onReveal?: () => void;
  className?: string;
};

export function MatchupGrid({
  rows,
  columns,
  cells,
  label,
  linkRows = true,
  contained,
  spotlight,
  reveal,
  onReveal,
  className,
}: MatchupGridProps) {
  const lastRow = rows.length - 1;
  const lastColumn = columns.length - 1;
  const firstCell = columns.findIndex(
    (column) => column.slug !== rows[0]?.slug,
  );
  const [focus, setFocus] = useState<Position>({
    row: 0,
    column: firstCell,
  });
  const [active, setActive] = useState<Position | null>(null);
  const table = useRef<HTMLTableElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const shown =
    active !== null && active.row >= 0 && active.column >= 0 ? active : null;
  const spotlitRow = rows.findIndex((deck) => deck.slug === spotlight);
  const spotlitColumn = columns.findIndex((deck) => deck.slug === spotlight);
  const spotlit = spotlitRow >= 0 || spotlitColumn >= 0;

  useLayoutEffect(() => {
    const cell = shown && elementAt(table.current, shown);

    if (cell && tooltip.current && frame.current) {
      placeTooltip(tooltip.current, frame.current, cell);
    }
  }, [shown]);

  const target = reveal ? revealTarget(spotlitRow, spotlitColumn) : null;
  const targetRow = target?.row;
  const targetColumn = target?.column;

  if (
    target !== null &&
    (focus.row !== target.row || focus.column !== target.column)
  ) {
    setFocus(target);
  }

  useEffect(() => {
    if (!reveal) {
      return;
    }

    if (targetRow !== undefined && targetColumn !== undefined) {
      elementAt(table.current, {
        row: targetRow,
        column: targetColumn,
      })?.scrollIntoView(
        targetColumn === -1
          ? { block: "start", inline: "nearest" }
          : { block: "nearest", inline: "start" },
      );
    }

    onReveal?.();
  }, [reveal, targetRow, targetColumn, onReveal]);

  useEffect(() => {
    const hide = (): void => setActive(null);

    window.addEventListener("resize", hide);

    return (): void => window.removeEventListener("resize", hide);
  }, []);

  const tabIndex = (row: number, column: number): number =>
    focus.row === row && focus.column === column ? 0 : -1;

  const moveTo = (row: number, column: number): void => {
    const outside =
      row < -1 || row > lastRow || column < -1 || column > lastColumn;

    if (outside || (row === -1 && column === -1)) {
      return;
    }

    setFocus({ row, column });
    elementAt(table.current, { row, column })?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>): void => {
    const from = positionOf(event.target);

    if (!from || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const { row, column } = from;

    switch (event.key) {
      case "ArrowRight":
        moveTo(row, column + 1);
        break;
      case "ArrowLeft":
        moveTo(row, column - 1);
        break;
      case "ArrowDown":
        moveTo(row + 1, column);
        break;
      case "ArrowUp":
        moveTo(row - 1, column);
        break;
      case "Home":
        moveTo(row, row === -1 ? 0 : -1);
        break;
      case "End":
        moveTo(row, lastColumn);
        break;
      case "Escape":
        setActive(null);
        break;
      case "Enter":
        elementAt(table.current, from)?.querySelector("a")?.click();
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  const onFocus = (event: FocusEvent<HTMLTableElement>): void => {
    const position = positionOf(event.target);

    if (position) {
      setFocus(position);
      setActive(position);
    }
  };

  const onBlur = (event: FocusEvent<HTMLTableElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setActive(null);
    }
  };

  const onMouseOver = (event: MouseEvent<HTMLTableElement>): void => {
    const position = positionOf(event.target);

    if (position && position.row >= 0 && position.column >= 0) {
      setActive(position);
    }
  };

  const onMouseLeave = (event: MouseEvent<HTMLTableElement>): void => {
    const focused = document.activeElement;

    setActive(
      event.currentTarget.contains(focused) ? positionOf(focused) : null,
    );
  };

  return (
    <div
      className={[
        "matchup",
        contained && "matchup--contained",
        spotlit && "matchup--spotlit",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="matchup__frame" ref={frame}>
        <div className="matchup__scroll" onScroll={() => setActive(null)}>
          <table
            ref={table}
            className="matchup__table"
            role="grid"
            aria-readonly="true"
            aria-label={label}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseOver={onMouseOver}
            onMouseLeave={onMouseLeave}
          >
            <thead>
              <tr>
                <th className="matchup__corner" scope="col">
                  <span className="visually-hidden">Deck</span>
                </th>
                {columns.map((deck, column) => (
                  <th
                    key={deck.slug}
                    className={[
                      "matchup__col",
                      active?.column === column && "matchup__col--active",
                      spotlitColumn === column && "matchup__col--spotlit",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    scope="col"
                    data-row={-1}
                    data-column={column}
                    tabIndex={tabIndex(-1, column)}
                  >
                    <WindowLink
                      className="matchup__link matchup__link--col"
                      to={`/decks/${deck.slug}`}
                      tabIndex={-1}
                    >
                      <span className="matchup__colname">{deck.name}</span>
                    </WindowLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowDeck, row) => (
                <tr key={rowDeck.slug}>
                  <th
                    className={[
                      "matchup__row",
                      active?.row === row && "matchup__row--active",
                      spotlitRow === row && "matchup__row--spotlit",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    scope="row"
                    data-row={row}
                    data-column={-1}
                    tabIndex={tabIndex(row, -1)}
                  >
                    {linkRows ? (
                      <WindowLink
                        className="matchup__link"
                        to={`/decks/${rowDeck.slug}`}
                        tabIndex={-1}
                      >
                        {rowDeck.name}
                      </WindowLink>
                    ) : (
                      rowDeck.name
                    )}
                  </th>
                  {columns.map((columnDeck, column) => {
                    const state = cellState(
                      cells,
                      rowDeck.slug,
                      columnDeck.slug,
                    );
                    const cell = cellOf(cells, rowDeck.slug, columnDeck.slug);

                    return (
                      <td
                        key={columnDeck.slug}
                        className={
                          spotlitRow === row || spotlitColumn === column
                            ? `matchup__cell matchup__cell--${state} matchup__cell--spotlit`
                            : `matchup__cell matchup__cell--${state}`
                        }
                        role="gridcell"
                        data-row={row}
                        data-column={column}
                        tabIndex={tabIndex(row, column)}
                        aria-label={cellSummary(
                          rowDeck.name,
                          columnDeck.name,
                          state,
                          cell,
                        )}
                      >
                        {cellText(state, cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {shown && (
          <div ref={tooltip} className="matchup__tooltip" role="tooltip">
            <MatchupDetail
              rowName={rows[shown.row].name}
              columnName={columns[shown.column].name}
              state={cellState(
                cells,
                rows[shown.row].slug,
                columns[shown.column].slug,
              )}
              cell={cellOf(
                cells,
                rows[shown.row].slug,
                columns[shown.column].slug,
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
