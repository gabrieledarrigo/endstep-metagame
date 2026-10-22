import type { TFunction } from "i18next";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Currency, SampleCard, SampleCardData } from "../../api/types";
import { SegmentedControl } from "../../components/SegmentedControl";
import { formatPrice } from "../../helpers";
import "./ListCost.css";

const CURRENCY_KEY = "currency";
const CURRENCIES: readonly Currency[] = ["tix", "eur", "usd"];

let chosen: Currency | null = null;

type ListCostProps = {
  main: SampleCard[];
  side: SampleCard[];
  cards: Record<string, SampleCardData>;
};

function storedCurrency(): Currency {
  if (chosen !== null) {
    return chosen;
  }

  let stored;

  try {
    stored = localStorage.getItem(CURRENCY_KEY);
  } catch {
    return "tix";
  }

  if (stored === "tix" || stored === "eur" || stored === "usd") {
    return stored;
  }

  return "tix";
}

function centsOf(
  board: SampleCard[],
  cards: Record<string, SampleCardData>,
  currency: Currency,
): number {
  return board.reduce((sum, card) => {
    const price = cards[card.name]?.[currency] ?? null;

    if (price === null) {
      return sum;
    }

    return sum + Math.round(price * 100) * card.count;
  }, 0);
}

function unpriced(
  boards: SampleCard[][],
  cards: Record<string, SampleCardData>,
  currency: Currency,
): number {
  const names = boards
    .flat()
    .filter((card) => (cards[card.name]?.[currency] ?? null) === null)
    .map((card) => card.name);

  return new Set(names).size;
}

function priceText(t: TFunction, cents: number, currency: Currency): string {
  const price = formatPrice(cents / 100, currency);

  return currency === "tix" ? t("deck.listCost.tix", { price }) : price;
}

export function ListCost({ main, side, cards }: ListCostProps) {
  const { t } = useTranslation();
  const id = useId();
  const [currency, setCurrency] = useState(storedCurrency);

  const mainCents = centsOf(main, cards, currency);
  const sideCents = centsOf(side, cards, currency);
  const total = mainCents + sideCents;
  const missing = unpriced([main, side], cards, currency);
  const split =
    side.length > 0
      ? t("deck.listCost.split", {
          main: priceText(t, mainCents, currency),
          side: priceText(t, sideCents, currency),
        })
      : t("deck.listCost.main", { main: priceText(t, mainCents, currency) });

  const choose = (next: Currency): void => {
    setCurrency(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
      chosen = null;
    } catch {
      chosen = next;
    }
  };

  return (
    <section className="list-cost" aria-labelledby={id}>
      <div className="list-cost__head">
        <h3 className="list-cost__label" id={id}>
          {t("deck.listCost.heading")}
        </h3>
        <SegmentedControl
          label={t("deck.listCost.currency")}
          options={CURRENCIES}
          labels={{ tix: t("deck.listCost.mtgo"), eur: "€", usd: "$" }}
          value={currency}
          onChange={choose}
          small
        />
      </div>
      {total > 0 && (
        <>
          <p className="list-cost__total">
            {currency === "tix" ? (
              <>
                {formatPrice(total / 100, currency)}{" "}
                <span className="list-cost__unit">
                  {t("deck.listCost.unit")}
                </span>
              </>
            ) : (
              formatPrice(total / 100, currency)
            )}
          </p>
          <p className="list-cost__split">{split}</p>
        </>
      )}
      <p className="list-cost__source">{t("deck.listCost.source")}</p>
      {missing > 0 && (
        <p className="list-cost__missing">
          {t("deck.listCost.missing", { count: missing })}
        </p>
      )}
    </section>
  );
}
