import type { TFunction } from "i18next";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MatrixDeck } from "../../api/types";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { canStep, formatShare, metagameShares, percent } from "../../helpers";
import { Stepper } from "./Stepper";
import "./Metagame.css";

function restLine(t: TFunction, decks: MatrixDeck[]): string {
  const top =
    Math.round(decks.reduce((sum, deck) => sum + deck.share, 0) * 1000) / 1000;

  return t("whatToPlay.metagame.rest", {
    count: decks.length,
    held: percent(top),
    rest: percent(1 - top),
  });
}

type MetagameProps = {
  decks: MatrixDeck[];
  changes: Record<string, number>;
  foldable: boolean;
  open: boolean;
  onToggle: () => void;
  onStep: (slug: string, step: 1 | -1) => void;
  onReset: () => void;
};

export function Metagame({
  decks,
  changes,
  foldable,
  open,
  onToggle,
  onStep,
  onReset,
}: MetagameProps) {
  const { t } = useTranslation();
  const bodyId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const shares = metagameShares(decks, changes);
  const changed = Object.keys(changes).length > 0;

  const reset = (): void => {
    onReset();
    title.current?.focus();
  };

  return (
    <Panel className="metagame">
      <div className="metagame__summary">
        <h2 ref={title} className="metagame__title" tabIndex={-1}>
          {t("whatToPlay.metagame.title")}
        </h2>
        {foldable && (
          <button
            type="button"
            className="metagame__toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={onToggle}
          >
            {open
              ? t("whatToPlay.metagame.close")
              : t("whatToPlay.metagame.open")}
          </button>
        )}
      </div>
      <div id={bodyId} className="metagame__body" hidden={foldable && !open}>
        <div className="metagame__intro">
          <p className="metagame__note">{t("whatToPlay.metagame.note")}</p>
          {changed && (
            <Button variant="ghost" className="metagame__reset" onClick={reset}>
              {t("whatToPlay.metagame.reset")}
            </Button>
          )}
        </div>
        <ul className="metagame__list">
          {decks.map((deck) => {
            const moved = Object.hasOwn(changes, deck.slug);

            return (
              <li
                key={deck.slug}
                className={
                  moved
                    ? "metagame__row metagame__row--changed"
                    : "metagame__row"
                }
              >
                <span className="metagame__name">
                  {deck.name}
                  {moved && (
                    <>
                      {" "}
                      <span className="metagame__was">
                        {t("whatToPlay.metagame.was", {
                          share: formatShare(deck.share),
                        })}
                      </span>
                    </>
                  )}
                </span>
                <Stepper
                  name={deck.name}
                  value={formatShare(shares[deck.slug])}
                  canLower={canStep(decks, changes, deck.slug, -1)}
                  canRaise={canStep(decks, changes, deck.slug, 1)}
                  onLower={() => onStep(deck.slug, -1)}
                  onRaise={() => onStep(deck.slug, 1)}
                />
              </li>
            );
          })}
        </ul>
        <p className="metagame__rest">{restLine(t, decks)}</p>
      </div>
    </Panel>
  );
}

export function MetagameSkeleton({ foldable }: { foldable: boolean }) {
  const { t } = useTranslation();

  return (
    <Panel className="metagame" aria-busy="true">
      <div className="metagame__summary">
        <h2 className="metagame__title">{t("whatToPlay.metagame.title")}</h2>
        {foldable && <Skeleton className="metagame__skeleton-toggle" />}
      </div>
      {!foldable && <Skeleton className="metagame__skeleton" />}
    </Panel>
  );
}
