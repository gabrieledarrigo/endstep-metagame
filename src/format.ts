import type { Population, Proportion, Provenance } from "./api/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a count with British English thousands separators.
 *
 * @param value - The count.
 * @returns The count as text, such as `2,023`.
 */
export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

/**
 * Formats a rate as a percentage with one decimal.
 *
 * @param rate - A rate between 0 and 1.
 * @returns The percentage, such as `52.2%`.
 */
export function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
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
 * Formats a meta share with two decimals.
 *
 * @param share - A share in percent.
 * @returns The share, such as `9.59%`.
 */
export function tooltipShare(share: number): string {
  return `${share.toFixed(2)}%`;
}

/**
 * Formats a win rate with one decimal.
 *
 * @param value - A win rate in percent.
 * @returns The win rate, such as `52.2%`.
 */
export function winRateText(value: number): string {
  return `${value.toFixed(1)}%`;
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
 * @returns The date in British English, such as `7 October 2026`.
 */
export function longDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDate(value: string, withYear: boolean): string {
  const [year, month, day] = value.split("-").map(Number);
  const head = `${day} ${MONTHS[month - 1]}`;

  return withYear ? `${head} ${year}` : head;
}

/**
 * Formats a date as its day and month, for a chart axis or a table of days.
 *
 * @param day - A date in `YYYY-MM-DD` form.
 * @returns The day and month, such as `5 Sep`.
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
 * @returns The range, such as `10 Sep to 9 Oct 2026`. The first date carries its year only when the years differ.
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
