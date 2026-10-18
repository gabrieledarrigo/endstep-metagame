import { useId } from "react";
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
  const valueId = useId();

  return (
    <span className="stepper">
      <button
        type="button"
        className="stepper__button"
        aria-label={`Less ${name}`}
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
        aria-label={`More ${name}`}
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
