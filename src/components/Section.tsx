import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  if (query.data !== undefined) {
    return children(query.data);
  }

  if (query.isError) {
    return (
      <StatePanel
        title={title}
        detail={query.error.message}
        action={
          <Button onClick={() => query.refetch()}>{t("common.retry")}</Button>
        }
      />
    );
  }

  return skeleton;
}
