import { Button } from "../../components/Button";
import { StatePanel } from "../../components/StatePanel";
import { WINDOWS } from "../../config";

export function EmptyWindow({ timeWindow, onSelect }) {
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
