import type { Deck } from "../../api/types";
import { Panel } from "../../components/Panel";
import { ShareChange } from "../../components/ShareChange";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import {
  formatCount,
  neededText,
  percent,
  readRate,
  tooltipShare,
} from "../../helpers";

export function DeckStats({ deck }: { deck: Deck }) {
  const winRate = readRate(deck.matchWinRate);

  return (
    <Panel>
      <StatList compact>
        {winRate.gated ? (
          <StatTile
            hero
            gated
            label="Match win rate"
            value="Too few to call"
            detail={neededText(winRate.decided, "matches")}
          />
        ) : (
          <StatTile
            hero
            label="Match win rate"
            value={percent(winRate.rate)}
            detail={`${percent(winRate.low)} to ${percent(winRate.high)}`}
          />
        )}
        <StatTile
          label="Meta share"
          value={tooltipShare(deck.share.rate * 100)}
        />
        <StatTile label="Players" value={formatCount(deck.players)} />
        <StatTile label="Matches" value={formatCount(winRate.decided)} />
        <StatTile
          label="Share change"
          value={<ShareChange change={deck.shareChange} />}
        />
      </StatList>
    </Panel>
  );
}
