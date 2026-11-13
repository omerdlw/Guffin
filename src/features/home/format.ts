const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const RELATIVE_TIME_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
];

export const formatCompact = (value: number) =>
  COMPACT_NUMBER_FORMAT.format(value);

export const formatWhole = (value: number) => value.toLocaleString("en-US");

export const formatReleaseDay = (iso: string) =>
  RELEASE_DATE_FORMAT.format(new Date(`${iso}T12:00:00Z`));

export function formatRelativeTime(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 60_000;
  for (const [unit, next] of RELATIVE_TIME_STEPS) {
    if (Math.abs(value) < next)
      return RELATIVE_TIME_FORMAT.format(Math.round(value), unit);
    value /= next;
  }
  return RELATIVE_TIME_FORMAT.format(Math.round(value), "year");
}
