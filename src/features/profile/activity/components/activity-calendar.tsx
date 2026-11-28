"use client";

import { type JSX, useMemo } from "react";
import { tipProps } from "@/design/components/tip-props";
import { cn } from "@/design/ui";
import type { ActivityDays } from "@/features/profile/stats";
import { pluralize } from "@/shared/format";

const DAY_MS = 86_400_000;

const NARROW_WEEKS = 26;

const LEVELS = ["bg-fill", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

const CELL = "aspect-square w-full rounded-mark";

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});

interface Day {
  count: number;
  date: Date;
  level: number;
}

interface Week {
  days: (Day | null)[];
  month: string | null;
}

function leveller(counts: readonly number[]): (count: number) => number {
  const active = counts.filter(Boolean).sort((a, b) => a - b);
  const at = (share: number) =>
    active[Math.floor(share * (active.length - 1))] ?? 0;
  const steps = [at(0.25), at(0.5), at(0.75)];
  return (count) =>
    count === 0 ? 0 : 1 + steps.filter((step) => count > step).length;
}

function streaks(counts: readonly number[]): {
  current: number;
  longest: number;
} {
  let longest = 0;
  let run = 0;
  for (const count of counts) {
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let end = counts.length - 1;
  if (counts[end] === 0) end -= 1;
  let current = 0;
  while (end >= 0 && counts[end] > 0) {
    current += 1;
    end -= 1;
  }
  return { current, longest };
}

function build(days: ActivityDays) {
  const level = leveller(days.counts);
  const from = Date.parse(`${days.from}T00:00:00Z`);
  const weeks: Week[] = [];
  let lastMonth = -1;

  days.counts.forEach((count, index) => {
    const date = new Date(from + index * DAY_MS);
    if (index % 7 === 0) {
      const month = date.getUTCMonth();
      weeks.push({
        days: [],
        month: month !== lastMonth && index > 0 ? MONTH.format(date) : null,
      });
      lastMonth = month;
    }
    weeks[weeks.length - 1].days.push({ count, date, level: level(count) });
  });
  const last = weeks[weeks.length - 1];
  while (last && last.days.length < 7) last.days.push(null);

  return {
    total: days.counts.reduce((sum, count) => sum + count, 0),
    weeks,
    ...streaks(days.counts),
  };
}

function Legend(): JSX.Element {
  return (
    <span aria-hidden="true" className="flex items-center gap-1 max-sm:hidden">
      <span className="mr-1">Less</span>
      {LEVELS.map((level) => (
        <span className={cn("size-2.5 rounded-mark", level)} key={level} />
      ))}
      <span className="ml-1">More</span>
    </span>
  );
}

export function ActivityCalendar({
  days,
}: {
  days: ActivityDays;
}): JSX.Element {
  const { current, longest, total, weeks } = useMemo(() => build(days), [days]);
  const narrowFrom = weeks.length - NARROW_WEEKS;
  return (
    <section className="flex flex-col gap-fib-4" data-section="activity">
      <header className="flex items-baseline justify-between gap-fib-3">
        <h2 className="type-label tracking-label text-ink-faint uppercase">
          Activity
        </h2>
        <span className="type-meta text-ink-muted tabular-nums">
          {pluralize(total, "activity", "activities")} in the last year
        </span>
      </header>

      <div>
        <div className="grid grid-cols-[auto_repeat(26,minmax(0,1fr))] gap-[3px] sm:grid-cols-[auto_repeat(53,minmax(0,1fr))]">
          <div
            aria-hidden="true"
            className="flex flex-col gap-[3px] pr-fib-1 type-micro text-ink-faint"
          >
            <span className="h-3" />
            {WEEKDAYS.map((label, index) => (
              <span className="flex flex-1 items-center" key={index}>
                {label}
              </span>
            ))}
          </div>
          {weeks.map((week, index) => (
            <div
              className={cn(
                "flex min-w-0 flex-col gap-[3px]",
                index < narrowFrom && "max-sm:hidden",
              )}
              data-part="week"
              key={index}
            >
              <span className="relative h-3">
                {week.month ? (
                  <span className="absolute top-0 left-0 type-micro whitespace-nowrap text-ink-muted">
                    {week.month}
                  </span>
                ) : null}
              </span>
              {week.days.map((day, weekday) =>
                day ? (
                  <span
                    className={cn(CELL, LEVELS[day.level], "hover:bg-ink")}
                    key={weekday}
                    {...tipProps(
                      day.count
                        ? pluralize(day.count, "activity", "activities")
                        : "No activity",
                      { sub: DATE.format(day.date) },
                    )}
                  />
                ) : (
                  <span className={CELL} key={weekday} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-fib-3 type-label text-ink-muted">
        <span className="flex gap-fib-4 tabular-nums">
          <span>
            Longest streak{" "}
            <span className="text-ink">{pluralize(longest, "day")}</span>
          </span>
          <span>
            Current{" "}
            <span className="text-ink">{pluralize(current, "day")}</span>
          </span>
        </span>
        <Legend />
      </footer>
    </section>
  );
}
