import { type ReactNode, useId } from "react";
import "./DeckSection.css";

type DeckSectionProps = {
  title: string;
  note?: string;
  className?: string;
  children: ReactNode;
};

export function DeckSection({
  title,
  note,
  className,
  children,
}: DeckSectionProps) {
  const id = useId();

  return (
    <section
      className={["deck-section", className].filter(Boolean).join(" ")}
      aria-labelledby={id}
    >
      <h2 className="deck-section__title" id={id}>
        {title}
      </h2>
      {note && <p className="deck-section__note">{note}</p>}
      {children}
    </section>
  );
}
