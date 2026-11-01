import type { JSX } from "react";
import { accountHref, movieHref } from "@/config/routes";
import { Avatar, Tooltip } from "@/ui";
import { cn } from "@/ui/cn";
import { RatingStars, Star } from "@/features/reviews";
import type { DiaryEntry, PersonPreview } from "../browse-types";
import { AccountLink } from "./link";
import { counted } from "./section";

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export function DiaryDigest({
  entries,
}: {
  entries: readonly DiaryEntry[];
}): JSX.Element {
  const months: { key: string; entries: DiaryEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.watchedOn.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else months.push({ entries: [entry], key });
  }

  return (
    <div className="flex flex-col gap-5">
      {months.map((month) => {
        const date = new Date(`${month.key}-01T00:00:00Z`);
        return (
          <div className="flex gap-3" key={month.key}>
            <span className="flex w-9 shrink-0 flex-col items-center self-start overflow-hidden rounded-thumb ring-1 ring-edge-focus ring-inset">
              <span className="w-full bg-fill-hover py-0.5 text-center type-micro font-semibold tracking-label text-ink-body uppercase">
                {MONTH.format(date)}
              </span>
              <span className="py-1 type-micro text-ink-muted tabular-nums">
                {date.getUTCFullYear()}
              </span>
            </span>
            <ol className="flex min-w-0 flex-1 flex-col gap-1">
              {month.entries.map((entry) => (
                <li
                  className="flex min-w-0 items-baseline gap-2.5 type-control leading-5"
                  key={entry.id}
                >
                  <span className="w-5 shrink-0 text-right text-ink-faint tabular-nums">
                    {Number(entry.watchedOn.slice(8, 10))}
                  </span>
                  <AccountLink
                    className="truncate text-ink-body hover:text-ink"
                    href={movieHref(entry.tmdbId)}
                  >
                    {entry.title}
                  </AccountLink>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

const stars = (value: number) =>
  `${"★".repeat(Math.floor(value))}${value % 1 ? "½" : ""}`;

export function RatingsChart({
  spread,
}: {
  spread: readonly number[];
}): JSX.Element {
  const peak = Math.max(1, ...spread);
  const total = spread.reduce((sum, count) => sum + count, 0);
  const average = total
    ? spread.reduce((sum, count, index) => sum + count * (index + 1), 0) /
      (2 * total)
    : 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <span className="type-display-xs leading-none font-semibold text-ink tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="flex flex-col gap-1.5">
          <RatingStars rating={Math.round(average * 2) / 2} size={12} />
          <span className="type-label leading-3 text-ink-muted">
            average rating
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex h-24 items-end gap-1 border-b border-line">
          {spread.map((count, index) => (
            <Tooltip
              key={index}
              text={`${stars((index + 1) / 2)} · ${counted(count, "rating")}`}
            >
              <span className="group/bar flex h-full flex-1 items-end">
                {count ? (
                  <span
                    className={cn(
                      "w-full rounded-t-mark group-hover/bar:bg-ink-muted",
                      count === peak ? "bg-ink-faint" : "bg-fill-active",
                    )}
                    style={{ height: `max(4px, ${(count / peak) * 100}%)` }}
                  />
                ) : null}
              </span>
            </Tooltip>
          ))}
        </div>
        <div aria-hidden="true" className="flex justify-between">
          <Star fill={1} size={9} />
          <span className="flex gap-px">
            {Array.from({ length: 5 }, (_, index) => (
              <Star fill={1} key={index} size={9} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

const PEOPLE_COLUMNS = 6;

export function PeopleGrid({
  people,
}: {
  people: readonly PersonPreview[];
}): JSX.Element {
  const full = people.length - (people.length % PEOPLE_COLUMNS);
  const shown = full > 0 ? people.slice(0, full) : people;
  return (
    <ul className="grid grid-cols-6 gap-2">
      {shown.map((person) => (
        <li key={person.username}>
          <Tooltip text={person.displayName}>
            <AccountLink
              aria-label={person.displayName}
              className="block aspect-square overflow-hidden rounded-full ring-1 ring-edge-hover ui-fade hover:opacity-80"
              href={accountHref(person.username)}
            >
              <Avatar
                className="rounded-full"
                name={person.displayName}
                size="100%"
                src={person.avatarUrl ?? undefined}
              />
            </AccountLink>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
