import "./SegmentedControl.css";

type SegmentedControlProps<Option extends string> = {
  label: string;
  options: readonly Option[];
  value: Option;
  onChange: (option: Option) => void;
  busy?: boolean;
};

export function SegmentedControl<Option extends string>({
  label,
  options,
  value,
  onChange,
  busy,
}: SegmentedControlProps<Option>) {
  return (
    <div
      className="segmented"
      role="group"
      aria-label={label}
      data-busy={busy || undefined}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="segmented__option"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
