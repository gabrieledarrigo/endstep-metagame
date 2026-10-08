import { Button } from "./Button";
import { StatePanel } from "./StatePanel";

export function Section({ state, skeleton, title, onRetry, children }) {
  if (state.status === "loading") {
    return skeleton;
  }

  if (state.status === "error") {
    return (
      <StatePanel
        title={title}
        detail={state.error.message}
        action={<Button onClick={onRetry}>Retry</Button>}
      />
    );
  }

  return children(state.data);
}
