import type { DeckDetail } from "../../api/types";
import { Panel } from "../../components/Panel";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import { formatCount, percent } from "../../format";

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
          value={percent(mulliganRate.rate)}
          detail={`${formatCount(mulliganRate.count)} of ${formatCount(mulliganRate.of)} games`}
        />
      </StatList>
    </Panel>
  );
}
