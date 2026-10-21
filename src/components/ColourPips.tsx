import { useTranslation } from "react-i18next";
import "./ColourPips.css";

type Colour = "W" | "U" | "B" | "R" | "G" | "C";

const PIP_FILL: Record<Colour, string> = {
  W: "#fffbd5",
  U: "#aae0fa",
  B: "#cbc2bf",
  R: "#f9aa8f",
  G: "#9bd3ae",
  C: "#cac5c0",
};

function isColour(letter: string): letter is Colour {
  return letter in PIP_FILL;
}

export function ColourPips({ colours }: { colours: string[] }) {
  const { t } = useTranslation();
  const known = colours.filter(isColour);
  const letters: Colour[] = known.length > 0 ? known : ["C"];

  return (
    <span className="colour-pips">
      <span className="visually-hidden">
        {t("components.colourPips.label", {
          colours: letters
            .map((letter) => t(`components.colourPips.${letter}`))
            .join(", "),
        })}
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
          <text
            className="colour-pips__letter"
            x="10"
            y="14.3"
            textAnchor="middle"
          >
            {letter}
          </text>
        </svg>
      ))}
    </span>
  );
}
