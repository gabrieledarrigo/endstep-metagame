import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { fetchStaples } from "../../api/endpoints";
import type { StaplesSection } from "../../api/types";
import { PageTitle } from "../../components/PageTitle";
import { SegmentedControl } from "../../components/SegmentedControl";
import { WINDOWS } from "../../config";
import { formatWindow } from "../../helpers";
import { useTimeWindow } from "../../hooks/useTimeWindow";
import { Staples } from "./Staples";
import "./StaplesPage.css";

const LIST_NAMES: Record<StaplesSection, string> = {
  main: "main deck",
  side: "sideboard",
};

export function StaplesPage() {
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
      <div className="staples-page__head">
        <PageTitle title="Staples" />
        <p className="staples-page__intro">
          The cards the top 24 decks play most.
        </p>
      </div>

      <div className="page__controls">
        <SegmentedControl
          label="Time window"
          options={WINDOWS}
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
          ? `Loading the ${LIST_NAMES[section]} for the ${timeWindow} window.`
          : ""}
      </p>

      <div className="page__body">
        <Staples
          query={staples}
          timeWindow={timeWindow}
          section={section}
          onSection={selectSection}
          onWindow={selectTimeWindow}
          busy={loadingWindow}
          loading={loading}
        />
      </div>
    </>
  );
}
