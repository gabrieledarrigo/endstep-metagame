const PIP_FILL = {
  W: "#fffbd5",
  U: "#aae0fa",
  B: "#cbc2bf",
  R: "#f9aa8f",
  G: "#9bd3ae",
  C: "#cac5c0",
};

const PIP_NAME = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colourless",
};

export function ColourPips({ colours }) {
  const known = (colours || []).filter((letter) => letter in PIP_FILL);
  const letters = known.length > 0 ? known : ["C"];

  return (
    <span className="colour-pips">
      <span className="visually-hidden">
        Colours: {letters.map((letter) => PIP_NAME[letter]).join(", ")}
      </span>
      {letters.map((letter, index) => (
        <svg
          key={index}
          className="colour-pips__pip"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="9"
            fill={PIP_FILL[letter]}
            stroke="rgba(11,11,11,.22)"
            strokeWidth="1"
          />
          <text x="10" y="14.3" textAnchor="middle">
            {letter}
          </text>
        </svg>
      ))}
    </span>
  );
}
