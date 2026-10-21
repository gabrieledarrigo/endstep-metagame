import type { TFunction } from "i18next";
import { Fragment, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Panel } from "../../components/Panel";
import { Skeleton } from "../../components/Skeleton";
import { WindowLink } from "../../components/WindowLink";
import { type RankedDeck, percent } from "../../helpers";
import "./Pick.css";

function joined(items: ReactNode[], last: string): ReactNode[] {
  return items.map((item, index) => {
    if (index === 0) {
      return <Fragment key={index}>{item}</Fragment>;
    }

    const separator = index === items.length - 1 ? ` ${last} ` : ", ";

    return (
      <Fragment key={index}>
        {separator}
        {item}
      </Fragment>
    );
  });
}

function why(t: TFunction, decks: RankedDeck[], more: number): string {
  if (decks.length === 1) {
    return t("whatToPlay.pick.why.one", {
      deck: decks[0].deck.name,
      rate: percent(decks[0].rate),
    });
  }

  const rates = decks.map((entry) => percent(entry.rate));
  const list = {
    rates: rates.slice(0, -1).join(", "),
    last: rates[rates.length - 1],
  };

  if (more === 0) {
    return t("whatToPlay.pick.why.many", list);
  }

  return t("whatToPlay.pick.why.more", { ...list, count: more });
}

function basisOf(
  t: TFunction,
  changed: boolean,
  period?: string,
): string | undefined {
  if (changed) {
    return t("whatToPlay.pick.basis.changed");
  }

  if (period === undefined) {
    return undefined;
  }

  return t("whatToPlay.pick.basis.period", { period });
}

type PickProps = {
  decks: RankedDeck[];
  more: number;
  changed?: boolean;
  period?: string;
};

export function Pick({ decks, more, changed = false, period }: PickProps) {
  const { t } = useTranslation();
  const basis = basisOf(t, changed, period);
  const links = decks.map((entry) => (
    <WindowLink className="pick__deck" to={`/decks/${entry.deck.slug}`}>
      {entry.deck.name}
    </WindowLink>
  ));

  return (
    <Panel className="pick">
      <span className="pick__label">{t("whatToPlay.pick.label")}</span>
      <h2 className="pick__title" aria-live="polite" aria-atomic="true">
        <Trans
          i18nKey="whatToPlay.pick.title"
          components={{ decks: <>{joined(links, t("whatToPlay.pick.or"))}</> }}
        />
      </h2>
      <p className="pick__why">{why(t, decks, more)}</p>
      {basis !== undefined && <p className="pick__basis">{basis}</p>}
    </Panel>
  );
}

export function PickSkeleton() {
  const { t } = useTranslation();

  return (
    <Panel className="pick" aria-busy="true">
      <span className="pick__label">{t("whatToPlay.pick.label")}</span>
      <Skeleton className="pick__skeleton-title" />
      <Skeleton className="pick__skeleton-line" />
    </Panel>
  );
}
