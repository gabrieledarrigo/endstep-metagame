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
  const read = readRate(block);

  if (read.gated) {
    return (
      <StatTile
        gated
        label={label}
        value="Too few to call"
        detail={neededText(read.decided, "games")}
      />
    );
  }

  return (
    <StatTile
      label={label}
      value={percent(read.rate)}
      detail={`${formatCount(read.decided)} games`}
    />
  );
}

export function DeckToss({ playDraw }: { playDraw: DeckDetail["playDraw"] }) {
  const { choseToDraw } = playDraw;

  return (
    <Panel>
      <StatList compact>
        <GameRateTile label="Won the toss" block={playDraw.tossWon} />
        <GameRateTile label="Lost the toss" block={playDraw.tossLost} />
        <StatTile
          label="Chose to draw"
          value={formatProportion(choseToDraw)}
          gated={choseToDraw.of === 0}
          detail={`${formatCount(choseToDraw.count)} of ${formatCount(choseToDraw.of)} tosses won`}
        />
      </StatList>
    </Panel>
  );
}
