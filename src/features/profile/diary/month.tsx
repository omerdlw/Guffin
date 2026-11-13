"use client";

import {
  type JSX,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { useRouter } from "next/navigation";
import { useConfirmedAction } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/components/surface";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { deleteDiaryEntryAction } from "@/features/account/actions";
import {
  DIARY_CALENDAR_GRID,
  DIARY_DAY_COLUMNS,
  DIARY_LAYOUT,
  type DiaryRow,
  posterImage,
  STRONG_CLASS,
} from "@/features/profile/profile";
import { useAccountDock } from "@/features/profile/shell";
import { RatingStars, Star } from "@/features/reviews/rating";
import { isRated } from "@/features/reviews/review";
import { mediaHref, reviewHref } from "@/lib/project";
import { useScrollDriver } from "@/motion/react";

const DIARY_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
  weekday: "short",
});

const DIARY_MONTH_NAME_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

const DIARY_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const DIARY_SCROLL_OFFSET = 96;

const DIARY_FLASH_MS = 1400;

function dayOf(value: string) {
  const parts = DIARY_DAY_FORMAT.formatToParts(new Date(`${value}T00:00:00Z`));
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

function Step({
  direction,
  href,
}: {
  direction: "next" | "previous";
  href: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const className = actionClass({
    className: "w-10 shrink-0 px-0",
  });
  const icon =
    direction === "next"
      ? "solar:alt-arrow-right-linear"
      : "solar:alt-arrow-left-linear";
  const label = direction === "next" ? "Next month" : "Previous month";

  return href ? (
    <DockLink aria-label={label} className={className} href={href}>
      <Icon icon={icon} size={16} />
    </DockLink>
  ) : (
    <span
      aria-disabled="true"
      aria-label={label}
      className={`${className} cursor-default opacity-50`}
      role="link"
    >
      <Icon icon={icon} size={16} />
    </span>
  );
}

function MonthAction({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  latest: string | null;
  next: string | null;
  previous: string | null;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const middle = actionClass({
    className: "min-w-0 flex-1",
  });

  return (
    <DockAction>
      <div className="flex w-full items-center gap-2.5">
        <Step direction="previous" href={previous} />
        {latest ? (
          <DockLink
            aria-label={`${label}, back to the latest month`}
            className={middle}
            href={latest}
          >
            <span className="truncate">{label}</span>
            <Icon icon="solar:restart-linear" size={14} />
          </DockLink>
        ) : (
          <span className={`${middle} cursor-default`}>
            <span className="truncate">{label}</span>
          </span>
        )}
        <Step direction="next" href={next} />
      </div>
    </DockAction>
  );
}

export function DiaryChrome({
  label,
  latest,
  next,
  previous,
}: {
  label: string;
  latest: string | null;
  next: string | null;
  previous: string | null;
}): null {
  const dock = useMemo(
    () => ({
      action: (
        <MonthAction
          label={label}
          latest={latest}
          next={next}
          previous={previous}
        />
      ),
    }),
    [label, latest, next, previous],
  );
  useAccountDock(dock);
  return null;
}

interface DiaryDay {
  date: string;
  rows: DiaryRow[];
}

const dayId = (date: string) => `day-${date}`;

function groupByDay(rows: readonly DiaryRow[]): DiaryDay[] {
  const days: DiaryDay[] = [];
  for (const row of rows) {
    const last = days.at(-1);
    if (last?.date === row.watchedOn) last.rows.push(row);
    else days.push({ date: row.watchedOn, rows: [row] });
  }
  return days;
}

function summarize(rows: readonly DiaryRow[], days: number) {
  const rated = rows.flatMap((row) =>
    isRated(row.rating) ? [row.rating] : [],
  );
  return {
    average: rated.length
      ? rated.reduce((sum, value) => sum + value, 0) / rated.length
      : null,
    days,
    films: rows.length,
    rewatches: rows.filter((row) => row.isRewatch).length,
  };
}

function Figure({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <dd className="order-1 flex items-center gap-1.5 type-title font-semibold text-ink tabular-nums sm:type-heading">
        {children}
      </dd>
      <dt className="order-2 type-micro font-semibold tracking-[0.04em] whitespace-nowrap text-ink-muted uppercase">
        {label}
      </dt>
    </div>
  );
}

function MonthHeader({
  month,
  rows,
  days,
}: {
  days: number;
  month: string;
  rows: readonly DiaryRow[];
}): JSX.Element {
  const date = new Date(`${month}-01T00:00:00Z`);
  const stats = summarize(rows, days);

  return (
    <header className="flex flex-col gap-fib-4 border-b border-line pb-fib-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className={cn(TONE.label, "text-ink-muted tabular-nums")}>
          Diary · {month.slice(0, 4)}
        </span>
        <h2 className="font-zuume type-display-lg leading-[0.85] font-bold text-ink uppercase sm:type-display-xl">
          {DIARY_MONTH_NAME_FORMAT.format(date)}
        </h2>
      </div>
      <dl className="flex gap-fib-5">
        <Figure label={stats.films === 1 ? "Film" : "Films"}>
          {stats.films}
        </Figure>
        <Figure label={stats.days === 1 ? "Day" : "Days"}>{stats.days}</Figure>
        {stats.rewatches ? (
          <Figure label="Rewatched">{stats.rewatches}</Figure>
        ) : null}
        {stats.average !== null ? (
          <Figure label="Avg rating">
            {stats.average.toFixed(1)}
            <Star fill={1} size={16} />
          </Figure>
        ) : null}
      </dl>
    </header>
  );
}

function PosterCalendar({
  byDate,
  month,
  onPick,
}: {
  byDate: ReadonlyMap<string, DiaryRow[]>;
  month: string;
  onPick: (date: string) => void;
}): JSX.Element {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const length = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const lead =
    (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className={cn(
          DIARY_CALENDAR_GRID,
          "type-micro font-semibold text-ink-faint",
        )}
      >
        {DIARY_WEEKDAYS.map((weekday, index) => (
          <span className="text-center" key={index}>
            {weekday}
          </span>
        ))}
      </div>
      <ol className={DIARY_CALENDAR_GRID}>
        {Array.from({ length: lead }, (_, index) => (
          <li aria-hidden="true" key={`lead-${index}`} />
        ))}
        {Array.from({ length }, (_, index) => {
          const day = index + 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const rows = byDate.get(date);
          const cover = rows?.[0];

          if (!cover || !rows) {
            return (
              <li
                className={cn(
                  "flex aspect-[2/3] items-start justify-start rounded-thumb p-1 type-micro text-ink-faint tabular-nums ring-1 ring-rule ring-inset",
                  date > today && "opacity-40",
                  date === today && "text-ink-body ring-edge-focus",
                )}
                key={date}
              >
                {day}
              </li>
            );
          }

          return (
            <li key={date}>
              <MediaCard
                fallbackIcon="solar:clapperboard-play-bold"
                fallbackIconSize={12}
                image={posterImage(cover.posterPath, "64px")}
                label={`${dayOf(date).weekday} ${day}: ${rows
                  .map((row) => row.title)
                  .join(", ")}`}
                onClick={() => onPick(date)}
                overlay={
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/0 to-black/0"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-1 left-1.5 type-micro font-semibold text-white tabular-nums"
                    >
                      {day}
                    </span>
                    {rows.length > 1 ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1 right-1 rounded-full bg-black/60 px-1 type-micro leading-4 font-semibold text-white tabular-nums backdrop-blur-sm"
                      >
                        {rows.length}
                      </span>
                    ) : null}
                  </>
                }
                radius={RADIUS.thumb}
                tooltip={rows.length > 1 ? `${rows.length} films` : cover.title}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DiaryDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  const router = useRouter();
  const { busy, confirmThen } = useConfirmedAction({
    fallback: "Could not remove this entry",
    name: "DiaryDeleteButton",
    onSuccess: () => router.refresh(),
  });

  return (
    <Button
      aria-label={`Remove ${title} from the diary`}
      className={cn(
        "opacity-0 group-focus-within/entry:opacity-100 group-hover/entry:opacity-100 [@media(hover:none)]:opacity-100",
        busy && "opacity-100",
      )}
      icon
      intent="ghost"
      shape="pill"
      size="sm"
      disabled={busy}
      loading={busy}
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
    >
      <Icon icon="solar:trash-bin-trash-bold" size={14} />
    </Button>
  );
}

function Tag({
  children,
  icon,
}: {
  children: ReactNode;
  icon: string;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 type-meta text-ink-muted">
      <Icon icon={icon} size={13} />
      {children}
    </span>
  );
}

function Entry({
  isOwner,
  row,
  username,
}: {
  isOwner: boolean;
  row: DiaryRow;
  username: string;
}): JSX.Element {
  const href = row.hasReview
    ? reviewHref(row.tmdbId, username, row.mediaType)
    : mediaHref(row.mediaType, row.tmdbId);

  return (
    <li className="group/entry flex items-center gap-fib-3 py-2.5 sm:gap-fib-4">
      <MediaCard
        aspect="free"
        className="w-12 shrink-0 sm:w-14"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={16}
        frameClassName="h-[4.5rem] w-12 sm:h-[5.25rem] sm:w-14"
        href={href}
        image={posterImage(row.posterPath, "56px")}
        label={row.title}
        radius={RADIUS.thumb}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex min-w-0 items-baseline gap-2">
          <DockLink
            className={cn(STRONG_CLASS, "truncate type-body sm:type-base")}
            href={href}
          >
            {row.title}
          </DockLink>
          {row.year ? (
            <span className="shrink-0 type-meta text-ink-muted tabular-nums">
              {row.year}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-x-fib-3 gap-y-1">
          {isRated(row.rating) ? <RatingStars rating={row.rating} /> : null}
          {row.isRewatch ? (
            <Tag icon="solar:restart-linear">Rewatch</Tag>
          ) : null}
          {row.hasReview ? (
            <DockLink
              className="inline-flex items-center gap-1 type-meta text-ink-body hover:text-ink focus-visible:text-ink"
              href={reviewHref(row.tmdbId, username, row.mediaType)}
            >
              <Icon icon="solar:pen-new-square-linear" size={13} />
              Review
            </DockLink>
          ) : null}
          {!isRated(row.rating) && !row.isRewatch && !row.hasReview ? (
            <span className="type-meta text-ink-faint">Logged</span>
          ) : null}
        </div>
      </div>
      {isOwner ? <DiaryDeleteButton id={row.id} title={row.title} /> : null}
    </li>
  );
}

function Day({
  day,
  flashing,
  isOwner,
  username,
}: {
  day: DiaryDay;
  flashing: boolean;
  isOwner: boolean;
  username: string;
}): JSX.Element {
  const { day: number, weekday } = dayOf(day.date);

  return (
    <section
      aria-label={`${weekday} ${number}`}
      className={cn(
        DIARY_DAY_COLUMNS,
        "cine-fade -mx-3 rounded-card px-3 py-fib-3",
        flashing && "bg-fill-hover",
      )}
      id={dayId(day.date)}
    >
      <time
        className="sticky top-fib-6 flex flex-col self-start pt-2.5"
        dateTime={day.date}
      >
        <span className="font-zuume type-heading leading-none font-bold text-ink tabular-nums sm:type-display-sm">
          {number}
        </span>
        <span className="type-label text-ink-muted">{weekday}</span>
      </time>
      <ul className="flex min-w-0 flex-col divide-y divide-rule">
        {day.rows.map((row) => (
          <Entry isOwner={isOwner} key={row.id} row={row} username={username} />
        ))}
      </ul>
    </section>
  );
}

export function DiaryMonthView({
  isOwner,
  month,
  rows,
  username,
}: {
  isOwner: boolean;
  month: string;
  rows: readonly DiaryRow[];
  username: string;
}): JSX.Element {
  const days = useMemo(() => groupByDay(rows), [rows]);
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day.rows] as const)),
    [days],
  );
  const driver = useScrollDriver();
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = (date: string) => {
    const target = document.getElementById(dayId(date));
    if (!target) return;
    const top =
      target.getBoundingClientRect().top + window.scrollY - DIARY_SCROLL_OFFSET;
    if (driver.active) driver.to(top);
    else window.scrollTo({ behavior: "smooth", top });
    setFlash(date);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), DIARY_FLASH_MS);
  };

  return (
    <div className="flex w-full flex-col gap-fib-5">
      <MonthHeader days={days.length} month={month} rows={rows} />
      <div className={DIARY_LAYOUT}>
        <aside className="lg:sticky lg:top-fib-6">
          <PosterCalendar byDate={byDate} month={month} onPick={pick} />
        </aside>
        <div className="flex min-w-0 flex-col">
          {days.map((day) => (
            <Day
              day={day}
              flashing={flash === day.date}
              isOwner={isOwner}
              key={day.date}
              username={username}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
