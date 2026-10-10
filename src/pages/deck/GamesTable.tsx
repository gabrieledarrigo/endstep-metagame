import { type FocusEvent, useLayoutEffect, useRef, useState } from "react";
import type { DeckDetail, GameSplit, WinLoss } from "../../api/types";
import { ChartTooltip } from "../../charts/ChartTooltip";
import { Panel } from "../../components/Panel";
import {
  formatCount,
  neededText,
  percent,
  placeTooltip,
  readRate,
} from "../../helpers";
import "./GamesTable.css";

const COLUMNS: { key: keyof GameSplit; label: string }[] = [
  { key: "onPlay", label: "On the play" },
  { key: "onDraw", label: "On the draw" },
  { key: "total", label: "Total" },
];

type GameCell = {
  id: string;
  title: string;
  block: WinLoss;
};

function cellLabel({ title, block }: GameCell): string {
  const read = readRate(block);

  if (read.gated) {
    return `${title}: too few to call, ${neededText(read.decided, "games")}`;
  }

  return `${title}: game win rate ${percent(read.rate)}, range ${percent(read.low)} to ${percent(read.high)}, ${formatCount(block.wins)} wins, ${formatCount(block.losses)} losses`;
}

function GameDetail({ title, block }: GameCell) {
  const read = readRate(block);
  const counts = [
    { key: "wins", name: "Wins", value: formatCount(block.wins) },
    { key: "losses", name: "Losses", value: formatCount(block.losses) },
  ];

  if (read.gated) {
    return (
      <ChartTooltip
        day={title}
        rows={counts}
        verdict={`Too few to call: ${neededText(read.decided, "games")}.`}
      />
    );
  }

  return (
    <ChartTooltip
      day={title}
      rows={[
        { key: "rate", name: "Game win rate", value: percent(read.rate) },
        {
          key: "range",
          name: "Range",
          value: `${percent(read.low)} to ${percent(read.high)}`,
        },
        ...counts,
      ]}
    />
  );
}

function unknownNote(games: number): string {
  if (games === 0) {
    return "Every game has a play or draw record.";
  }

  return `${formatCount(games)} ${games === 1 ? "game has" : "games have"} no play or draw record and count only in the totals.`;
}

export function GamesTable({
  results,
}: {
  results: DeckDetail["gameResults"];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const focusedId = useRef<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLTableCellElement>());

  useLayoutEffect(() => {
    const cell = activeId && cells.current.get(activeId);

    if (cell && tooltip.current && frame.current) {
      placeTooltip(tooltip.current, frame.current, cell);
    }
  }, [activeId, results]);

  if (results === null) {
    return (
      <Panel>
        <p className="games__unavailable">
          Game results are not available for this window.
        </p>
      </Panel>
    );
  }

  const rows = [
    ...results.rows.map((row) => ({
      key: String(row.gameNumber),
      label: `Game ${row.gameNumber}`,
      split: row,
      total: false,
    })),
    { key: "all", label: "All games", split: results.total, total: true },
  ];

  const grid = rows.map((row) => ({
    ...row,
    cells: COLUMNS.map((column) => ({
      id: `${row.key}-${column.key}`,
      title: `${row.label}, ${column.label.toLowerCase()}`,
      block: row.split[column.key],
    })),
  }));
  const active = grid
    .flatMap((row) => row.cells)
    .find((cell) => cell.id === activeId);
  const gated = grid.some((row) =>
    row.cells.some((cell) => readRate(cell.block).gated),
  );

  const onFocusCell = (cell: GameCell): void => {
    focusedId.current = cell.id;
    setActiveId(cell.id);
  };

  const onBlur = (event: FocusEvent<HTMLTableElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      focusedId.current = null;
      setActiveId(null);
    }
  };

  const onMouseLeave = (): void => {
    setActiveId(focusedId.current);
  };

  return (
    <Panel className="games">
      <div className="games__frame" ref={frame}>
        <div className="games__scroll">
          <table
            className="games__table"
            onBlur={onBlur}
            onMouseLeave={onMouseLeave}
          >
            <thead>
              <tr>
                <td className="games__corner" />
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col" className="games__col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr
                  key={row.key}
                  className={
                    row.total ? "games__row games__row--total" : "games__row"
                  }
                >
                  <th scope="row" className="games__head">
                    {row.label}
                  </th>
                  {row.cells.map((cell) => {
                    const read = readRate(cell.block);

                    return (
                      <td
                        key={cell.id}
                        ref={(element) => {
                          if (element) {
                            cells.current.set(cell.id, element);
                          } else {
                            cells.current.delete(cell.id);
                          }
                        }}
                        className={
                          read.gated
                            ? "games__cell games__cell--gated"
                            : "games__cell"
                        }
                        tabIndex={0}
                        aria-label={cellLabel(cell)}
                        onFocus={() => onFocusCell(cell)}
                        onMouseEnter={() => setActiveId(cell.id)}
                      >
                        {read.gated ? "" : percent(read.rate)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {active && (
          <div ref={tooltip} className="games__tooltip" role="tooltip">
            <GameDetail {...active} />
          </div>
        )}
      </div>

      <p className="games__note">{unknownNote(results.unknownPositionGames)}</p>
      {gated && (
        <p className="games__note">
          A hatched cell has fewer than 20 decided games, too few to call.
        </p>
      )}
    </Panel>
  );
}
