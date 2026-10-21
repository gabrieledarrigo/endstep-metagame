import { useTranslation } from "react-i18next";
import type { DecksResponse } from "../../api/types";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { StatList } from "../../components/StatList";
import { StatTile } from "../../components/StatTile";
import { formatCount, formatPopulation, formatWindow } from "../../helpers";

const SUMMARY_TILES = [
  { name: "registrations", value: 177 },
  { name: "players", value: 40 },
  { name: "archetypes", value: 26 },
  { name: "window", value: 167 },
  { name: "population", value: 42 },
] as const;

export function SummarySkeleton() {
  const { t } = useTranslation();

  return (
    <Panel aria-busy="true">
      <StatList>
        {SUMMARY_TILES.map((tile, index) => (
          <StatTile
            key={tile.name}
            hero={index === 0}
            label={t(`overview.summary.${tile.name}`)}
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

type SummaryProps = {
  decks: DecksResponse;
  loading?: boolean;
};

export function Summary({ decks, loading }: SummaryProps) {
  const { t } = useTranslation();
  const { provenance, totals } = decks;

  return (
    <Panel>
      <StatList>
        <StatTile
          hero
          label={t("overview.summary.registrations")}
          value={formatCount(totals.registrations)}
        />
        <StatTile
          label={t("overview.summary.players")}
          value={formatCount(totals.players)}
        />
        <StatTile
          label={t("overview.summary.archetypes")}
          value={formatCount(decks.decks.total)}
        />
        <StatTile
          label={t("overview.summary.window")}
          value={
            loading ? (
              <Skeleton width={167} height="1.6em" />
            ) : (
              formatWindow(provenance.window)
            )
          }
        />
        <StatTile
          label={t("overview.summary.population")}
          value={formatPopulation(provenance.population)}
        />
      </StatList>
    </Panel>
  );
}
