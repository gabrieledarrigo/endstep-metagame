import type {
  Currency,
  Population,
  Proportion,
  Provenance,
} from "../api/types";

const DEFAULT_LOCALE = "en-GB";

function userLocales(): string {
  return (
    window.navigator.languages?.[0] ??
    window.navigator.language ??
    DEFAULT_LOCALE
  );
}

/**
 * Formats a count with British English thousands separators.
 *
 * @param value - The count.
 * @returns The count as text, such as `2,023`.
 */
export function formatCount(value: number): string {
  const locales = userLocales();

  return value.toLocaleString(locales);
}

/**
 * Formats a rate as a percentage with one decimal in the user's locales.
 *
 * @param rate - A rate between 0 and 1.
 * @returns The percentage, such as `52.2%`.
 */
export function percent(rate: number): string {
  const locales = userLocales();

  return new Intl.NumberFormat(locales, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate);
}

/**
 * Formats a rate as a whole percentage in the user's locales, FR-18.
 *
 * @param rate - A rate between 0 and 1.
 * @returns The percentage, rounded to the nearest whole number, such as `97%`.
 */
export function wholePercent(rate: number): string {
  const locales = userLocales();

  return new Intl.NumberFormat(locales, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(rate);
}

/**
 * Formats a card's average copies with one decimal in the user's locales, FR-18.
 *
 * @param copies - The average copies of the card in the lists that play it.
 * @returns The copies, such as `3.9 copies`.
 */
export function formatCopies(copies: number): string {
  const locales = userLocales();
  const count = new Intl.NumberFormat(locales, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(copies);

  return `${count} copies`;
}

/**
 * Formats a meta share with one decimal in the user's locales. A share above zero never reads as zero.
 *
 * @param rate - A share between 0 and 1.
 * @returns The share, such as `9.6%`, or `<0.1%` for a share above zero that one decimal would round to zero.
 */
export function formatShare(rate: number): string {
  if (rate > 0 && rate < 0.0005) {
    return `<${percent(0.001)}`;
  }

  return percent(rate);
}

/**
 * Formats a tick on a percentage axis.
 *
 * @param share - A value in percent.
 * @returns The value with a percent sign, such as `5%`.
 */
export function axisShare(share: number): string {
  return `${share}%`;
}

/**
 * Formats a meta share with two decimals in the user's locales. A share above zero never reads as zero.
 *
 * @param share - A share in percent.
 * @returns The share, such as `9.59%`, or `<0.01%` for a share above zero that two decimals would round to zero.
 */
export function tooltipShare(share: number): string {
  const locales = userLocales();
  const format = new Intl.NumberFormat(locales, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (share > 0 && share < 0.005) {
    return `<${format.format(0.0001)}`;
  }

  return format.format(share / 100);
}

/**
 * Formats a win rate with one decimal in the user's locales.
 *
 * @param value - A win rate in percent.
 * @returns The win rate, such as `52.2%`.
 */
export function winRateText(value: number): string {
  const locales = userLocales();

  return new Intl.NumberFormat(locales, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Shortens a date to its month and day, for an axis tick.
 *
 * @param day - A date in `YYYY-MM-DD` form.
 * @returns The month and day, such as `10-07`.
 */
export function shortDay(day: string): string {
  return day.slice(5);
}

/**
 * Formats a date in full, for a tooltip.
 *
 * @param day - A date in `YYYY-MM-DD` form.
 * @returns The day, the month and the year in the reader's locale, such as `7 October 2026` in en-GB.
 */
export function longDay(day: string): string {
  const locales = userLocales();

  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locales, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDate(value: string, withYear: boolean): string {
  const locales = userLocales();

  const date = new Date(value).toLocaleDateString(locales, {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });

  return date;
}

/**
 * Formats a date as its day and month, for a chart axis or a list of days.
 *
 * @param day - A date in `YYYY-MM-DD` form.
 * @returns The day and month in the reader's locale, such as `5 Sept` in en-GB.
 */
export function formatDay(day: string): string {
  return formatDate(day, false);
}

function lastCoveredDay(to: string): string {
  const day = new Date(`${to}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);

  return day.toISOString().slice(0, 10);
}

/**
 * Formats the dates a window covers, ending on its last covered day rather than on its exclusive `to`, §6.7.
 *
 * @param window - The window from a response's provenance.
 * @returns The range, such as `10 Sept to 9 Oct 2026`. The first date carries its year only when the years differ.
 */
export function formatWindow({
  from,
  to,
}: Pick<Provenance["window"], "from" | "to">): string {
  const last = lastCoveredDay(to);
  const sameYear = from.slice(0, 4) === last.slice(0, 4);

  return `${formatDate(from, !sameYear)} to ${formatDate(last, true)}`;
}

/**
 * Capitalises a population for display.
 *
 * @param population - The population from a response's provenance.
 * @returns The population with a capital letter, such as `Rated`.
 */
export function formatPopulation(population: Population): string {
  return population.charAt(0).toUpperCase() + population.slice(1);
}

/**
 * Formats a proportion as a percentage, or says it is not available when there is nothing to count it from.
 *
 * @param proportion - A count out of a total, with its rate.
 * @returns The percentage with one decimal, such as `33.8%`, or `Not available` when the total is 0.
 */
export function formatProportion(proportion: Proportion): string {
  return proportion.of === 0 ? "Not available" : percent(proportion.rate);
}

/**
 * Formats a price with two decimals in the user's locales, FR-19.
 *
 * @param amount - The price, in tickets, euros or dollars.
 * @param currency - The currency the price is in.
 * @returns The price, such as `238.41` in tickets, with no unit, or `€194.00` and `$173.64` in euros and dollars.
 */
export function formatPrice(amount: number, currency: Currency): string {
  const locales = userLocales();

  if (currency === "tix") {
    return new Intl.NumberFormat(locales, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat(locales, {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}
