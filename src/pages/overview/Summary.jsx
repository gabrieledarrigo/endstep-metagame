import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { StatTile } from "../../components/StatTile";
import { formatCount, formatPopulation, formatWindow } from "../../format";

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
      <dl className="stat-list">
        {SUMMARY_TILES.map((tile, index) => (
          <div
            key={index}
            className={index === 0 ? "stat-tile stat-tile--hero" : "stat-tile"}
          >
            <dt className="stat-tile__label">{tile.label}</dt>
            <dd className="stat-tile__value">
              <Skeleton
                width={tile.value}
                height={index === 0 ? "1.05em" : "1.6em"}
              />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function Summary({ decks }) {
  const { provenance, totals } = decks;

  return (
    <dl className="stat-list">
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
    </dl>
  );
}
