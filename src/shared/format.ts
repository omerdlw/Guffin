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

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function pluralize(
  count: number,
  one: string,
  many = `${one}s`,
): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

export function toLogline(
  overview: string | null | undefined,
  maxLength: number,
  enoughLength: number,
): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > maxLength) break;
    line = next;
    if (line.length >= enoughLength) break;
  }
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}
