import { useTranslation } from "react-i18next";
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
  title,
  detail,
}: EmptyWindowProps) {
  const { t } = useTranslation();
  const text =
    detail ??
    t("components.emptyWindow.detail", {
      window: t(`common.window.${timeWindow}`),
    });
  const longer: TimeWindow | undefined =
    WINDOWS[WINDOWS.indexOf(timeWindow) + 1];

  return (
    <StatePanel
      title={title ?? t("components.emptyWindow.title")}
      detail={
        longer ? t("components.emptyWindow.longer", { detail: text }) : text
      }
      action={
        longer && (
          <Button variant="secondary" onClick={() => onSelect(longer)}>
            {t("components.emptyWindow.switch", {
              window: t(`common.window.${longer}`),
            })}
          </Button>
        )
      }
    />
  );
}
