import "./SegmentedControl.css";

export function SegmentedControl({ label, options, value, onChange, busy }) {
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
