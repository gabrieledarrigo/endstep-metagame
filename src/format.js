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

export function formatCount(value) {
  return value.toLocaleString("en-GB");
}

export function percent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

export const axisShare = (share) => `${share}%`;
export const tooltipShare = (share) => `${share.toFixed(2)}%`;
export const winRateText = (value) => `${value.toFixed(1)}%`;

export const shortDay = (day) => day.slice(5);
export const longDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

function formatDate(value, withYear) {
  const [year, month, day] = value.split("-").map(Number);
  const head = `${day} ${MONTHS[month - 1]}`;

  return withYear ? `${head} ${year}` : head;
}

function lastCoveredDay(to) {
  const day = new Date(`${to}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);

  return day.toISOString().slice(0, 10);
}

export function formatWindow({ from, to }) {
  const last = lastCoveredDay(to);
  const sameYear = from.slice(0, 4) === last.slice(0, 4);

  return `${formatDate(from, !sameYear)} to ${formatDate(last, true)}`;
}

export function formatPopulation(population) {
  return population.charAt(0).toUpperCase() + population.slice(1);
}
