import type { TimeWindow } from "../api/types";
import { Button } from "./Button";
import { StatePanel } from "./StatePanel";
import { WINDOWS } from "../config";

type EmptyWindowProps = {
  timeWindow: TimeWindow;
  onSelect: (next: TimeWindow) => void;
  title?: string;
  detail?: string;
};

export function EmptyWindow({
  timeWindow,
  onSelect,
  title = "No decks in this window",
  detail = `The ${timeWindow} window has no registrations yet.`,
}: EmptyWindowProps) {
  const longer: TimeWindow | undefined =
    WINDOWS[WINDOWS.indexOf(timeWindow) + 1];

  return (
    <StatePanel
      title={title}
      detail={longer ? `${detail} Try a longer window.` : detail}
      action={
        longer && (
          <Button variant="secondary" onClick={() => onSelect(longer)}>
            Switch to {longer}
          </Button>
        )
      }
    />
  );
}
