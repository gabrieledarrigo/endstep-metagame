import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type {
  SampleCard,
  SampleCardData,
  SampleList as SampleListData,
} from "../../api/types";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { formatCount } from "../../helpers";
import { ListCost } from "./ListCost";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { CardPreview } from "./CardPreview";
import { CardSheet } from "./CardSheet";
import "./SampleList.css";

function sorted(cards: SampleCard[]): SampleCard[] {
  return [...cards].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "en-GB"),
  );
}

function total(cards: SampleCard[]): number {
  return cards.reduce((sum, card) => sum + card.count, 0);
}

function lines(cards: SampleCard[]): string {
  return cards.map((card) => `${card.count} ${card.name}`).join("\n");
}

function source(t: TFunction, list: SampleListData): string {
  const count = list.players ?? 0;
  const players = formatCount(count);

  if (list.state === "mainOnly") {
    return t("deck.sampleList.mainOnly", { count, players });
  }

  const lists = formatCount(list.distinctLists);

  if (list.similarity === null) {
    return t("deck.sampleList.shown", { count, players, lists });
  }

  return t("deck.sampleList.shownLike", {
    count,
    players,
    lists,
    similarity: Math.round(list.similarity * 100),
  });
}

function withheldNote(t: TFunction, list: SampleListData): string {
  if (list.reason === "no_registrations") {
    return t("deck.sampleList.noRegistrations");
  }

  return t("deck.sampleList.withheld", { min: list.minPlayers });
}

type Shown = { key: string; name: string; imageUrl: string };

type Previewed = Shown & { element: HTMLButtonElement };

type Opened = Shown & { trigger: HTMLButtonElement };

type CardListProps = {
  title: string;
  cards: SampleCard[];
  renderName: (card: SampleCard, key: string) => ReactNode;
};

function CardList({ title, cards, renderName }: CardListProps) {
  return (
    <>
      <h3 className="sample-list__heading">
        {title} <span className="sample-list__total">{total(cards)}</span>
      </h3>
      <ul className="sample-list__cards">
        {cards.map((card) => (
          <li key={card.name} className="sample-list__card">
            <span className="sample-list__count">{card.count}</span>
            {renderName(card, `${title}/${card.name}`)}
          </li>
        ))}
      </ul>
    </>
  );
}

type SampleListProps = {
  list: SampleListData;
  cards?: Record<string, SampleCardData>;
  cardsPending?: boolean;
};

export function SampleList({ list, cards, cardsPending }: SampleListProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState(false);
  const [preview, setPreview] = useState<Previewed | null>(null);
  const [sheet, setSheet] = useState<Opened | null>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focused = useRef<Previewed | null>(null);
  const canHover = useMediaQuery("(hover: hover)");
  const hidePreview = useCallback(() => {
    focused.current = null;
    setPreview(null);
  }, []);

  if (list.state === "withheld") {
    return (
      <Panel className="sample-list">
        <p className="sample-list__note">{withheldNote(t, list)}</p>
      </Panel>
    );
  }

  const main = sorted(list.main);
  const side = list.state === "shown" ? sorted(list.side) : [];
  const what = list.state === "shown" ? "list" : "mainDeck";
  const copied =
    side.length > 0 ? `${lines(main)}\n\n${lines(side)}` : lines(main);

  const copy = async (): Promise<void> => {
    setStatus("");

    try {
      await navigator.clipboard.writeText(copied);
      setFallback(false);
      setStatus(t(`deck.sampleList.copied.${what}`));
    } catch {
      setStatus(t(`deck.sampleList.fallback.${what}`));
      setFallback(true);
      requestAnimationFrame(() => {
        text.current?.focus();
        text.current?.select();
      });
    }
  };

  const leave = (element: HTMLButtonElement): void => {
    if (focused.current?.element.isConnected === false) {
      focused.current = null;
    }

    const fallback = focused.current;
    setPreview((shown) => (shown?.element === element ? fallback : shown));
  };

  const blur = (element: HTMLButtonElement): void => {
    if (focused.current?.element === element) {
      focused.current = null;
    }

    setPreview((shown) => (shown?.element === element ? null : shown));
  };

  const closeSheet = (): void => {
    sheet?.trigger.focus();
    setSheet(null);
  };

  const renderName = (card: SampleCard, key: string): ReactNode => {
    const imageUrl = cards?.[card.name]?.imageUrl;

    if (typeof imageUrl !== "string") {
      return <span className="sample-list__name">{card.name}</span>;
    }

    const shown = { key, name: card.name, imageUrl };

    const onPointerEnter = (event: PointerEvent<HTMLButtonElement>): void => {
      if (!canHover || event.pointerType === "touch") {
        return;
      }

      setPreview({ ...shown, element: event.currentTarget });
    };

    const onFocus = (event: FocusEvent<HTMLButtonElement>): void => {
      if (
        !canHover ||
        sheet !== null ||
        !event.currentTarget.matches(":focus-visible")
      ) {
        return;
      }

      focused.current = { ...shown, element: event.currentTarget };
      setPreview(focused.current);
    };

    return (
      <button
        type="button"
        className={
          sheet?.key === key
            ? "sample-list__name sample-list__name--preview sample-list__name--active"
            : "sample-list__name sample-list__name--preview"
        }
        aria-haspopup="dialog"
        onPointerEnter={onPointerEnter}
        onPointerLeave={(event) => leave(event.currentTarget)}
        onFocus={onFocus}
        onBlur={(event) => blur(event.currentTarget)}
        onClick={(event) => {
          setPreview(null);
          setSheet({ ...shown, trigger: event.currentTarget });
        }}
      >
        {card.name}
      </button>
    );
  };

  return (
    <Panel ref={panel} className="sample-list">
      <p className="sample-list__source">{source(t, list)}</p>
      <div className="sample-list__actions">
        <Button variant="secondary" onClick={copy}>
          {t(`deck.sampleList.copy.${what}`)}
        </Button>
        <span className="sample-list__status" role="status">
          {status}
        </span>
      </div>
      {fallback && (
        <textarea
          ref={text}
          className="sample-list__text"
          readOnly
          rows={8}
          aria-label={t(`deck.sampleList.text.${what}`)}
          value={copied}
        />
      )}
      <CardList
        title={t("deck.sampleList.main")}
        cards={main}
        renderName={renderName}
      />
      {list.state === "mainOnly" && (
        <>
          <h3 className="sample-list__heading">{t("deck.sampleList.side")}</h3>
          <p className="sample-list__note">
            {t("deck.sampleList.sideHidden", { min: list.minPlayers })}
          </p>
        </>
      )}
      {side.length > 0 && (
        <CardList
          title={t("deck.sampleList.side")}
          cards={side}
          renderName={renderName}
        />
      )}
      {cards && !cardsPending && (
        <ListCost main={main} side={side} cards={cards} />
      )}
      {preview !== null && (
        <CardPreview
          key={preview.key}
          imageUrl={preview.imageUrl}
          name={preview.element}
          panel={panel}
          onHide={hidePreview}
        />
      )}
      {sheet !== null && (
        <CardSheet
          key={sheet.key}
          name={sheet.name}
          imageUrl={sheet.imageUrl}
          onClose={closeSheet}
        />
      )}
    </Panel>
  );
}
