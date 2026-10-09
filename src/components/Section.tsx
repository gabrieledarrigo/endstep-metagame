import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { StatePanel } from "./StatePanel";

type SectionProps<Data> = {
  query: UseQueryResult<Data>;
  skeleton: ReactNode;
  title: string;
  children: (data: Data) => ReactNode;
};

export function Section<Data>({
  query,
  skeleton,
  title,
  children,
}: SectionProps<Data>) {
  if (query.isPending || (query.isError && query.isFetching)) {
    return skeleton;
  }

  if (query.isError) {
    return (
      <StatePanel
        title={title}
        detail={query.error.message}
        action={<Button onClick={() => query.refetch()}>Retry</Button>}
      />
    );
  }

  return children(query.data);
}
