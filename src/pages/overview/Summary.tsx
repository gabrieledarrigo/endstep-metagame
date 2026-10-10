import type { DecksResponse } from "../../api/types";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import { formatCount, formatPopulation, formatWindow } from "../../helpers";

const SUMMARY_TILES = [
  { label: "Registrations", value: 177 },
  { label: "Players", value: 40 },
  { label: "Archetypes", value: 26 },
  { label: "Window", value: 167 },
  { label: "Population", value: 42 },
];

export function SummarySkeleton() {
  return (
    <Panel aria-busy="true">
      <StatList>
        {SUMMARY_TILES.map((tile, index) => (
          <StatTile
            key={tile.label}
            hero={index === 0}
            label={tile.label}
            value={
              <Skeleton
                width={tile.value}
                height={index === 0 ? "1.05em" : "1.6em"}
              />
            }
          />
        ))}
      </StatList>
    </Panel>
  );
}

export function Summary({ decks }: { decks: DecksResponse }) {
  const { provenance, totals } = decks;

  return (
    <Panel>
      <StatList>
        <StatTile
          hero
          label="Registrations"
          value={formatCount(totals.registrations)}
        />
        <StatTile label="Players" value={formatCount(totals.players)} />
        <StatTile label="Archetypes" value={formatCount(decks.decks.total)} />
        <StatTile label="Window" value={formatWindow(provenance.window)} />
        <StatTile
          label="Population"
          value={formatPopulation(provenance.population)}
        />
      </StatList>
    </Panel>
  );
}
