import type { TFunction } from "i18next";
import { type FocusEvent, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeckDetail, GameSplit, WinLoss } from "../../api/types";
import { ChartTooltip } from "../../charts/ChartTooltip";
import { Panel } from "../../components/Panel";
import {
  formatCount,
  neededText,
  percent,
  placeTooltip,
  type ReadRate,
  readRate,
} from "../../helpers";
import "./GamesTable.css";

const COLUMNS: readonly (keyof GameSplit)[] = ["onPlay", "onDraw", "total"];

type GameCell = {
  id: string;
  title: string;
  block: WinLoss;
  read: ReadRate;
};

function cellLabel(t: TFunction, { title, block, read }: GameCell): string {
  if (read.gated) {
    return t("deck.games.gatedLabel", {
      title,
      needed: neededText(read.decided, "games"),
    });
  }

  return t("deck.games.label", {
    title,
    rate: percent(read.rate),
    range: t("common.range", {
      from: percent(read.low),
      to: percent(read.high),
    }),
    wins: t("deck.games.winCount", {
      count: block.wins,
      wins: formatCount(block.wins),
    }),
    losses: t("deck.games.lossCount", {
      count: block.losses,
      losses: formatCount(block.losses),
    }),
  });
}

function GameDetail({ title, block, read }: GameCell) {
  const { t } = useTranslation();
  const counts = [
    {
      key: "wins",
      name: t("deck.games.wins"),
      value: formatCount(block.wins),
    },
    {
      key: "losses",
      name: t("deck.games.losses"),
      value: formatCount(block.losses),
    },
  ];

  if (read.gated) {
    return (
      <ChartTooltip
        day={title}
        rows={counts}
        verdict={t("deck.games.gated", {
          needed: neededText(read.decided, "games"),
        })}
      />
    );
  }

  return (
    <ChartTooltip
      day={title}
      rows={[
        {
          key: "rate",
          name: t("deck.games.rate"),
          value: percent(read.rate),
        },
        {
          key: "range",
          name: t("deck.games.range"),
          value: t("common.range", {
            from: percent(read.low),
            to: percent(read.high),
          }),
        },
        ...counts,
      ]}
    />
  );
}

function unknownNote(t: TFunction, games: number): string {
  if (games === 0) {
    return t("deck.games.allKnown");
  }

  return t("deck.games.unknown", { count: games, games: formatCount(games) });
}

export function GamesTable({
  results,
}: {
  results: DeckDetail["gameResults"];
}) {
  const { t } = useTranslation();
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
      <Panel className="games">
        <p className="games__unavailable">{t("deck.games.unavailable")}</p>
      </Panel>
    );
  }

  const rows = [
    ...results.rows.map((row, index) => ({
      key: String(row.gameNumber),
      label: t("deck.games.game", { number: row.gameNumber }),
      split: row,
      className:
        index === results.rows.length - 1
          ? "games__row games__row--last"
          : "games__row",
    })),
    {
      key: "all",
      label: t("deck.games.all"),
      split: results.total,
      className: "games__row games__row--total",
    },
  ];

  const grid = rows.map((row) => ({
    ...row,
    cells: COLUMNS.map((column) => ({
      id: `${row.key}-${column}`,
      title: t(`deck.games.cell.${column}`, { row: row.label }),
      block: row.split[column],
      read: readRate(row.split[column]),
    })),
  }));
  const active = grid
    .flatMap((row) => row.cells)
    .find((cell) => cell.id === activeId);
  const gated = grid.some((row) => row.cells.some((cell) => cell.read.gated));

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
                  <th key={column} scope="col" className="games__col">
                    {t(`deck.games.columns.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.key} className={row.className}>
                  <th scope="row" className="games__head">
                    {row.label}
                  </th>
                  {row.cells.map((cell) => {
                    const { read } = cell;

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
                        aria-label={cellLabel(t, cell)}
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

      <p className="games__note">
        {unknownNote(t, results.unknownPositionGames)}
      </p>
      {gated && <p className="games__note">{t("deck.games.hatched")}</p>}
    </Panel>
  );
}
