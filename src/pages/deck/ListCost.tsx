import { useId, useState } from "react";
import type { Currency, SampleCard, SampleCardData } from "../../api/types";
import { SegmentedControl } from "../../components/SegmentedControl";
import { formatPrice } from "../../helpers";
import "./ListCost.css";

const CURRENCY_KEY = "currency";
const OPTIONS = ["MTGO", "€", "$"] as const;

type Option = (typeof OPTIONS)[number];

const CURRENCIES: Record<Option, Currency> = {
  MTGO: "tix",
  "€": "eur",
  $: "usd",
};

type ListCostProps = {
  main: SampleCard[];
  side: SampleCard[];
  cards: Record<string, SampleCardData>;
};

function storedCurrency(): Currency {
  let stored;

  try {
    stored = localStorage.getItem(CURRENCY_KEY);
  } catch {
    return "tix";
  }

  if (stored === "eur" || stored === "usd") {
    return stored;
  }

  return "tix";
}

function optionOf(currency: Currency): Option {
  return OPTIONS.find((option) => CURRENCIES[option] === currency) ?? "MTGO";
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

function priceText(cents: number, currency: Currency): string {
  const price = formatPrice(cents / 100, currency);

  return currency === "tix" ? `${price} tix` : price;
}

export function ListCost({ main, side, cards }: ListCostProps) {
  const id = useId();
  const [currency, setCurrency] = useState(storedCurrency);

  const mainCents = centsOf(main, cards, currency);
  const sideCents = centsOf(side, cards, currency);
  const total = mainCents + sideCents;
  const missing = unpriced([main, side], cards, currency);
  const split =
    side.length > 0
      ? `Main deck ${priceText(mainCents, currency)} · Sideboard ${priceText(sideCents, currency)}`
      : `Main deck ${priceText(mainCents, currency)}`;

  const choose = (option: Option): void => {
    const next = CURRENCIES[option];
    setCurrency(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      return;
    }
  };

  return (
    <section className="list-cost" aria-labelledby={id}>
      <div className="list-cost__head">
        <h3 className="list-cost__label" id={id}>
          Cost to build
        </h3>
        <SegmentedControl
          label="Currency"
          options={OPTIONS}
          value={optionOf(currency)}
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
                <span className="list-cost__unit">tix</span>
              </>
            ) : (
              formatPrice(total / 100, currency)
            )}
          </p>
          <p className="list-cost__split">{split}</p>
        </>
      )}
      <p className="list-cost__source">
        Prices from Scryfall, at each card’s cheapest printing.
      </p>
      {missing > 0 && (
        <p className="list-cost__missing">
          No price for {missing} {missing === 1 ? "card" : "cards"}.
        </p>
      )}
    </section>
  );
}
