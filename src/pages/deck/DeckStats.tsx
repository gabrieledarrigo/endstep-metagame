import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const winRate = readRate(deck.matchWinRate);

  return (
    <Panel>
      <StatList compact>
        {winRate.gated ? (
          <StatTile
            hero
            gated
            label={t("deck.stats.winRate")}
            value={t("deck.stats.tooFew")}
            detail={neededText(winRate.decided, "matches")}
          />
        ) : (
          <StatTile
            hero
            label={t("deck.stats.winRate")}
            value={percent(winRate.rate)}
            detail={t("common.range", {
              from: percent(winRate.low),
              to: percent(winRate.high),
            })}
          />
        )}
        <StatTile
          label={t("deck.stats.metaShare")}
          value={tooltipShare(deck.share.rate * 100)}
        />
        <StatTile
          label={t("deck.stats.players")}
          value={formatCount(deck.players)}
        />
        <StatTile
          label={t("deck.stats.matches")}
          value={formatCount(winRate.decided)}
        />
        <StatTile
          label={t("deck.stats.shareChange")}
          value={<ShareChange change={deck.shareChange} />}
        />
      </StatList>
    </Panel>
  );
}
