import type { DeckDetail } from "../../api/types";
import { Panel } from "../../components/Panel";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import { formatCount, formatProportion } from "../../helpers";

export function DeckTexture({ texture }: { texture: DeckDetail["texture"] }) {
  const { mulliganRate } = texture;

  return (
    <Panel>
      <StatList compact>
        <StatTile
          label="Average turns"
          value={texture.averageTurns.toFixed(1)}
        />
        <StatTile
          label="Opening hand"
          value={`${texture.averageOpeningHand.toFixed(1)} cards`}
        />
        <StatTile
          label="Mulligan rate"
          value={formatProportion(mulliganRate)}
          gated={mulliganRate.of === 0}
          detail={`${formatCount(mulliganRate.count)} of ${formatCount(mulliganRate.of)} games`}
        />
      </StatList>
    </Panel>
  );
}
