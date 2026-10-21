import { useTranslation } from "react-i18next";
import type { DeckDetail } from "../../api/types";
import { Panel } from "../../components/Panel";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import { formatCount, formatProportion } from "../../helpers";

export function DeckTexture({ texture }: { texture: DeckDetail["texture"] }) {
  const { t } = useTranslation();
  const { mulliganRate } = texture;

  return (
    <Panel>
      <StatList compact>
        <StatTile
          label={t("deck.texture.turns")}
          value={texture.averageTurns.toFixed(1)}
        />
        <StatTile
          label={t("deck.texture.openingHand")}
          value={t("deck.texture.cards", {
            cards: texture.averageOpeningHand.toFixed(1),
          })}
        />
        <StatTile
          label={t("deck.texture.mulligan")}
          value={formatProportion(mulliganRate)}
          gated={mulliganRate.of === 0}
          detail={t("deck.texture.mulliganGames", {
            mulligans: formatCount(mulliganRate.count),
            games: formatCount(mulliganRate.of),
          })}
        />
      </StatList>
    </Panel>
  );
}
