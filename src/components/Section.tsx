import type { ReactNode } from "react";
import type { ResourceState } from "../hooks/useResource";
import { Button } from "./Button";
import { StatePanel } from "./StatePanel";

type SectionProps<Data> = {
  state: ResourceState<Data>;
  skeleton: ReactNode;
  title: string;
  onRetry: () => void;
  children: (data: Data) => ReactNode;
};

export function Section<Data>({
  state,
  skeleton,
  title,
  onRetry,
  children,
}: SectionProps<Data>) {
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
