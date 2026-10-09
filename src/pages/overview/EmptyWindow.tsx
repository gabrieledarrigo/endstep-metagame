import type { TimeWindow } from "../../api/types";
import { Button } from "../../components/Button";
import { StatePanel } from "../../components/StatePanel";
import { WINDOWS } from "../../config";

type EmptyWindowProps = {
  timeWindow: TimeWindow;
  onSelect: (next: TimeWindow) => void;
};

export function EmptyWindow({ timeWindow, onSelect }: EmptyWindowProps) {
  const longer = WINDOWS[WINDOWS.indexOf(timeWindow) + 1];

  return (
    <StatePanel
      title="No decks in this window"
      detail={
        longer
          ? `The ${timeWindow} window has no registrations yet. Try a longer window.`
          : `The ${timeWindow} window has no registrations yet.`
      }
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
