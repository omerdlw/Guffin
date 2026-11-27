"use client";

import { type JSX, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmedAction } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { Tooltip } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import { cn } from "@/design/ui";
import { deleteDiaryEntryAction } from "@/features/account/actions";
import { RatingStars, Star } from "@/features/reviews/components/rating";
import { isRated, REVIEW_ICON_LINEAR } from "@/features/reviews/model";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { useScrollDriver } from "@/motion/core/provider";
import { pluralize } from "@/shared/format";
import { movieHref, reviewHref } from "@/shared/site";
import type { DiaryEntry } from "../model";

const STRONG =
  "font-medium text-ink underline decoration-transparent underline-offset-2 hover:decoration-current";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAME = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
});

const LEDGER =
  "grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-fib-3";

const dayId = (date: string) => `diary-${date}`;

function poster(path: string | null, sizes: string) {
  return {
    sizes,
    src: tmdbImageUrl("poster", path, "w185"),
    srcSet: tmdbImageSrcSet("poster", path, ["w92", "w185"]) ?? undefined,
  };
}

function entryHref(entry: DiaryEntry, username: string): string {
  if (entry.hasReview) {
    return reviewHref(entry.tmdbId, username);
  }
  return movieHref(entry.tmdbId);
}

function groupByDate(
  entries: readonly DiaryEntry[],
): Map<string, DiaryEntry[]> {
  const days = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    const day = days.get(entry.watchedOn);
    if (day) day.push(entry);
    else days.set(entry.watchedOn, [entry]);
  }
  return days;
}

function Summary({
  days,
  entries,
}: {
  days: number;
  entries: readonly DiaryEntry[];
}): JSX.Element {
  const rated = entries.flatMap((entry) =>
    isRated(entry.rating) ? [entry.rating] : [],
  );
  const average = rated.length
    ? rated.reduce((sum, value) => sum + value, 0) / rated.length
    : null;
  const rewatches = entries.filter((entry) => entry.isRewatch).length;
  const parts = [
    pluralize(entries.length, "film"),
    pluralize(days, "day"),
    rewatches ? pluralize(rewatches, "rewatch", "rewatches") : null,
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-fib-2 type-meta text-ink-muted tabular-nums">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? (
            <span aria-hidden="true" className="mr-fib-2 text-ink-faint">
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
      {average !== null ? (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="mr-1 text-ink-faint">
            ·
          </span>
          <Star fill={1} size={11} />
          {average.toFixed(1)} average
        </span>
      ) : null}
    </p>
  );
}

function Step({
  direction,
  href,
}: {
  direction: "next" | "previous";
  href: string | null;
}): JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = direction === "next";

  return (
    <button
      aria-busy={pending || undefined}
      aria-label={next ? "Next month" : "Previous month"}
      className={cn(
        "center size-control-sm rounded-full",
        href
          ? "text-ink-muted hover:bg-fill hover:text-ink"
          : "text-ink-faint opacity-40",
      )}
      disabled={!href}
      onClick={() =>
        href && startTransition(() => router.replace(href, { scroll: false }))
      }
      type="button"
    >
      <Icon
        icon={
          next ? "solar:alt-arrow-right-linear" : "solar:alt-arrow-left-linear"
        }
        size={16}
      />
    </button>
  );
}

function Header({
  days,
  entries,
  month,
  next,
  previous,
}: {
  days: number;
  entries: readonly DiaryEntry[];
  month: string;
  next: string | null;
  previous: string | null;
}): JSX.Element {
  return (
    <header className="flex flex-col gap-fib-2" data-part="header">
      <div className="flex items-center justify-between gap-fib-3">
        <h2 className="flex items-baseline gap-fib-2 font-zuume type-display-xs leading-none font-bold uppercase sm:type-display-sm">
          <span className="text-ink">
            {MONTH_NAME.format(new Date(`${month}-01T00:00:00Z`))}
          </span>
          <span className="text-ink-faint tabular-nums">
            {month.slice(0, 4)}
          </span>
        </h2>
        <div className="flex gap-fib-1">
          <Step direction="previous" href={previous} />
          <Step direction="next" href={next} />
        </div>
      </div>
      {entries.length > 0 ? <Summary days={days} entries={entries} /> : null}
    </header>
  );
}

function PosterCalendar({
  byDate,
  month,
  onPick,
}: {
  byDate: ReadonlyMap<string, DiaryEntry[]>;
  month: string;
  onPick: (date: string) => void;
}): JSX.Element {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, index - 1, 1)).getUTCDay() + 6) % 7;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-fib-2" data-part="calendar">
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 type-micro text-ink-faint"
      >
        {WEEKDAYS.map((weekday, at) => (
          <span className="text-center" key={at}>
            {weekday}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, at) => (
          <li aria-hidden="true" key={`lead-${at}`} />
        ))}
        {Array.from({ length }, (_, at) => {
          const day = at + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const entries = byDate.get(date);
          const cover = entries?.[0];

          if (!cover || !entries) {
            return (
              <li
                className={cn(
                  "center aspect-[2/3] rounded-mark type-micro tabular-nums",
                  date > today ? "text-ink-faint/50" : "bg-fill text-ink-faint",
                  date === today &&
                    "text-ink ring-1 ring-edge-focus ring-inset",
                )}
                key={date}
              >
                {day}
              </li>
            );
          }

          return (
            <li data-part="tile" key={date}>
              <MediaCard
                fallbackIcon="solar:clapperboard-play-bold"
                fallbackIconSize={10}
                image={poster(cover.posterPath, "48px")}
                label={`${day}: ${entries.map((entry) => entry.title).join(", ")}`}
                onClick={() => onPick(date)}
                overlay={
                  entries.length > 1 ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0.5 bottom-0.5 rounded-full bg-page/80 px-1 type-micro leading-none font-semibold text-ink tabular-nums"
                    >
                      +{entries.length - 1}
                    </span>
                  ) : null
                }
                radius={RADIUS.mark}
                tooltip={
                  entries.length > 1 ? `${entries.length} entries` : cover.title
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RemoveEntry({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  const router = useRouter();
  const { busy, confirmThen } = useConfirmedAction({
    fallback: "Could not remove this entry",
    name: "RemoveDiaryEntry",
    onSuccess: () => router.refresh(),
  });

  return (
    <button
      aria-busy={busy || undefined}
      aria-label={`Remove ${title} from the diary`}
      className={cn(
        "center size-control-xs shrink-0 rounded-full text-ink-faint hover:bg-fill hover:text-ink",
        "opacity-0 group-hover/entry:opacity-100 [@media(hover:none)]:opacity-100",
        busy && "opacity-100",
      )}
      disabled={busy}
      onClick={() =>
        void confirmThen(
          {
            action: "Remove",
            description: "This diary entry is removed for good",
            title: `Remove ${title}?`,
          },
          () => deleteDiaryEntryAction(id),
        )
      }
      type="button"
    >
      <Icon icon="solar:trash-bin-trash-linear" size={13} />
    </button>
  );
}

function Flag({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}): JSX.Element {
  return (
    <Tooltip text={label}>
      <DockLink
        aria-label={label}
        className="center size-control-xs rounded-full text-ink-faint hover:bg-fill hover:text-ink"
        href={href}
      >
        <Icon icon={icon} size={13} />
      </DockLink>
    </Tooltip>
  );
}

function Entry({
  entry,
  first,
  isOwner,
  username,
}: {
  entry: DiaryEntry;
  first: boolean;
  isOwner: boolean;
  username: string;
}): JSX.Element {
  const href = entryHref(entry, username);
  const date = new Date(`${entry.watchedOn}T00:00:00Z`);

  return (
    <li
      className={cn(
        LEDGER,
        "group/entry scroll-mt-fib-7 py-fib-2",
        first && "border-t border-rule first:border-t-0",
      )}
      id={first ? dayId(entry.watchedOn) : undefined}
      data-part="entry"
    >
      {first ? (
        <time className="flex flex-col items-center" dateTime={entry.watchedOn}>
          <span className="font-zuume type-heading leading-none font-bold text-ink tabular-nums">
            {date.getUTCDate()}
          </span>
          <span className="type-micro tracking-label text-ink-faint uppercase">
            {WEEKDAY.format(date)}
          </span>
        </time>
      ) : (
        <span aria-hidden="true" />
      )}

      <MediaCard
        className="w-10"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={14}
        href={href}
        image={poster(entry.posterPath, "40px")}
        label={entry.title}
        radius={RADIUS.mark}
      />

      <div className="flex min-w-0 items-baseline gap-fib-2">
        <DockLink className={cn(STRONG, "truncate type-body")} href={href}>
          {entry.title}
        </DockLink>
        <span className="shrink-0 type-meta text-ink-faint tabular-nums">
          {entry.year}
        </span>
        <span className="flex shrink-0 items-center self-center">
          {entry.isRewatch ? (
            <Flag
              href={movieHref(entry.tmdbId)}
              icon="solar:restart-linear"
              label="Rewatch"
            />
          ) : null}
          {entry.hasReview ? (
            <Flag
              href={reviewHref(entry.tmdbId, username)}
              icon={REVIEW_ICON_LINEAR}
              label="Read the review"
            />
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-fib-1">
        {isRated(entry.rating) ? (
          <RatingStars rating={entry.rating} size={11} />
        ) : null}
        {isOwner ? <RemoveEntry id={entry.id} title={entry.title} /> : null}
      </div>
    </li>
  );
}

export function DiaryMonthView({
  empty,
  entries,
  isOwner,
  month,
  next,
  previous,
  username,
}: {
  empty: string;
  entries: readonly DiaryEntry[];
  isOwner: boolean;
  month: string;
  next: string | null;
  previous: string | null;
  username: string;
}): JSX.Element {
  const byDate = useMemo(() => groupByDate(entries), [entries]);
  const driver = useScrollDriver();

  const pick = (date: string) => {
    const target = document.getElementById(dayId(date));
    if (!target) return;
    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      parseFloat(getComputedStyle(target).scrollMarginTop);
    if (driver.active) driver.to(top);
    else window.scrollTo({ behavior: "smooth", top });
  };

  return (
    <section className="flex flex-col gap-fib-5" data-section="diary">
      <Header
        days={byDate.size}
        entries={entries}
        month={month}
        next={next}
        previous={previous}
      />
      {entries.length === 0 ? (
        <p className="py-fib-6 text-center type-body text-ink-muted">{empty}</p>
      ) : (
        <div className="grid items-start gap-fib-5 sm:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-fib-6">
          <aside className="sm:sticky sm:top-fib-7">
            <PosterCalendar byDate={byDate} month={month} onPick={pick} />
          </aside>
          <ol className="flex min-w-0 flex-col">
            {[...byDate.values()].flatMap((day) =>
              day.map((entry, index) => (
                <Entry
                  entry={entry}
                  first={index === 0}
                  isOwner={isOwner}
                  key={entry.id}
                  username={username}
                />
              )),
            )}
          </ol>
        </div>
      )}
    </section>
  );
}
