import { useId } from "react";
import { useTranslation } from "react-i18next";
import "./Stepper.css";

type StepperProps = {
  name: string;
  value: string;
  canLower: boolean;
  canRaise: boolean;
  onLower: () => void;
  onRaise: () => void;
};

export function Stepper({
  name,
  value,
  canLower,
  canRaise,
  onLower,
  onRaise,
}: StepperProps) {
  const { t } = useTranslation();
  const valueId = useId();

  return (
    <span className="stepper">
      <button
        type="button"
        className="stepper__button"
        aria-label={t("whatToPlay.stepper.lower", { name })}
        aria-describedby={valueId}
        aria-disabled={canLower ? undefined : true}
        onClick={() => {
          if (canLower) {
            onLower();
          }
        }}
      >
        −
      </button>
      <span id={valueId} className="stepper__value">
        {value}
      </span>
      <button
        type="button"
        className="stepper__button"
        aria-label={t("whatToPlay.stepper.raise", { name })}
        aria-describedby={valueId}
        aria-disabled={canRaise ? undefined : true}
        onClick={() => {
          if (canRaise) {
            onRaise();
          }
        }}
      >
        +
      </button>
    </span>
  );
}
