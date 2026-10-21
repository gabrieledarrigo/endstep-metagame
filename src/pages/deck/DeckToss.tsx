import { useTranslation } from "react-i18next";
import type { DeckDetail, WinLoss } from "../../api/types";
import { Panel } from "../../components/Panel";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import {
  formatCount,
  formatProportion,
  neededText,
  percent,
  readRate,
} from "../../helpers";

function GameRateTile({ label, block }: { label: string; block: WinLoss }) {
  const { t } = useTranslation();
  const read = readRate(block);

  if (read.gated) {
    return (
      <StatTile
        gated
        label={label}
        value={t("deck.toss.tooFew")}
        detail={neededText(read.decided, "games")}
      />
    );
  }

  return (
    <StatTile
      label={label}
      value={percent(read.rate)}
      detail={t("deck.toss.games", { games: formatCount(read.decided) })}
    />
  );
}

export function DeckToss({ playDraw }: { playDraw: DeckDetail["playDraw"] }) {
  const { t } = useTranslation();
  const { choseToDraw } = playDraw;

  return (
    <Panel>
      <StatList compact>
        <GameRateTile label={t("deck.toss.won")} block={playDraw.tossWon} />
        <GameRateTile label={t("deck.toss.lost")} block={playDraw.tossLost} />
        <StatTile
          label={t("deck.toss.draw")}
          value={formatProportion(choseToDraw)}
          gated={choseToDraw.of === 0}
          detail={t("deck.toss.drawTosses", {
            draws: formatCount(choseToDraw.count),
            tosses: formatCount(choseToDraw.of),
          })}
        />
      </StatList>
    </Panel>
  );
}
