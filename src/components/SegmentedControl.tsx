import "./SegmentedControl.css";

type SegmentedControlProps<Option extends string> = {
  label: string;
  options: readonly Option[];
  labels?: Readonly<Record<Option, string>>;
  value: Option;
  onChange: (option: Option) => void;
  busy?: boolean;
  small?: boolean;
};

export function SegmentedControl<Option extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  busy,
  small,
}: SegmentedControlProps<Option>) {
  return (
    <div
      className={small ? "segmented segmented--small" : "segmented"}
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
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}
