import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { fetchStaples } from "../../api/endpoints";
import type { StaplesSection } from "../../api/types";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { formatWindow } from "../../helpers";
import { useCanonicalLink } from "../../hooks/useCanonicalLink";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { Staples } from "./Staples";
import { StaplesHead } from "./StaplesHead";

export function StaplesPage() {
  const { t } = useTranslation();
  useCanonicalLink();
  const [timeWindow, selectTimeWindow] = useTimeWindow();
  const [searchParams, setSearchParams] = useSearchParams();
  const section: StaplesSection =
    searchParams.get("section") === "side" ? "side" : "main";
  const staples = useQuery({
    queryKey: ["staples", timeWindow, section],
    queryFn: ({ signal }) => fetchStaples(timeWindow, section, signal),
    retry: false,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === section && previous?.cards.length
        ? previous
        : undefined,
  });
  const loadingWindow = staples.isPlaceholderData;
  const loading = staples.isPending || loadingWindow;

  const selectSection = (next: StaplesSection): void => {
    if (next === section) {
      return;
    }

    setSearchParams(
      (params) => {
        if (next === "main") {
          params.delete("section");
        } else {
          params.set("section", next);
        }

        return params;
      },
      { replace: true },
    );
  };

  return (
    <>
      <StaplesHead />

      <div className="page__controls">
        <SegmentedControl
          label={t("common.timeWindow")}
          options={WINDOWS}
          labels={t("common.window", { returnObjects: true })}
          value={timeWindow}
          onChange={(next) => selectTimeWindow(next, loading)}
          busy={loading}
        />
        {staples.data && !loadingWindow && (
          <span className="page__dates">
            {formatWindow(staples.data.window)}
          </span>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {loading
          ? t(`staples.staplesPage.loading.${section}`, {
              window: t(`common.window.${timeWindow}`),
            })
          : ""}
      </p>

      <div className="page__body">
        <Staples
          query={staples}
          timeWindow={timeWindow}
          section={section}
          onSection={selectSection}
          onWindow={selectTimeWindow}
        />
      </div>
    </>
  );
}
