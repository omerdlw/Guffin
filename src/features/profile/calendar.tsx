"use client";

import { type JSX, type PointerEvent, useMemo, useRef, useState } from "react";
import { cn } from "@/ui/cn";
import { pluralize } from "@/lib/format";
import {
  ACTIVITY_DATE_FORMAT,
  CALENDAR_CELL,
  CALENDAR_LEVELS,
} from "./constants";
import { AccountPart } from "./motion";
import type { ActivityDays, CalendarDay } from "./types";
import { buildCalendar } from "./utils";

export function ActivityCalendar({
  days,
}: {
  days: ActivityDays;
}): JSX.Element {
  const { total, weeks } = useMemo(() => buildCalendar(days), [days]);

  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    day: CalendarDay;
    x: number;
    y: number;
  } | null>(null);

  const onPointerOver = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-week]",
    );
    const box = frame.current?.getBoundingClientRect();
    if (!cell || !box) return setHover(null);
    const day =
      weeks[Number(cell.dataset.week)]?.days[Number(cell.dataset.day)];
    if (!day) return setHover(null);
    const rect = cell.getBoundingClientRect();
    setHover({
      day,
      x: Math.min(
        Math.max(rect.left + rect.width / 2 - box.left, 64),
        box.width - 64,
      ),
      y: rect.top - box.top,
    });
  };

  return (
    <div className="relative flex flex-col gap-3" ref={frame}>
      <div className="flex gap-2">
        <AccountPart
          aria-hidden="true"
          className="grid shrink-0 grid-rows-[12px_repeat(7,10px)] gap-[3px] type-micro leading-none text-ink-faint"
          name="week"
        >
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
        </AccountPart>
        <div
          aria-label={`${pluralize(total, "activity", "activities")} in the last year`}
          className="flex min-w-0 flex-1 flex-row-reverse justify-start gap-[3px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_28px)]"
          onPointerLeave={() => setHover(null)}
          onPointerOver={onPointerOver}
          role="img"
        >
          {weeks.toReversed().map((week, back) => {
            const index = weeks.length - 1 - back;
            return (
              <AccountPart
                className="flex shrink-0 flex-col gap-[3px]"
                index={index}
                key={index}
                name="week"
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
                      className={cn(
                        CALENDAR_CELL,
                        CALENDAR_LEVELS[day.level],
                        "hover:bg-ink focus-visible:bg-ink",
                      )}
                      data-day={weekday}
                      data-week={index}
                      key={weekday}
                    />
                  ) : (
                    <span className={CALENDAR_CELL} key={weekday} />
                  ),
                )}
              </AccountPart>
            );
          })}
        </div>
      </div>

      <AccountPart
        className="flex items-center justify-between gap-3 type-label text-ink-muted"
        name="row"
      >
        <span className="tabular-nums">
          {total.toLocaleString("en-US")} in the last year
        </span>
        <span aria-hidden="true" className="flex items-center gap-[3px]">
          <span className="mr-1">Less</span>
          {CALENDAR_LEVELS.map((level) => (
            <span className={cn(CALENDAR_CELL, level)} key={level} />
          ))}
          <span className="ml-1">More</span>
        </span>
      </AccountPart>

      {hover ? (
        <div
          className="tooltip-content pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap select-none"
          data-state="instant-open"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <span className="tooltip-ink">
            {hover.day.count
              ? pluralize(hover.day.count, "activity", "activities")
              : "No activity"}
            <span className="tooltip-meta">
              {ACTIVITY_DATE_FORMAT.format(hover.day.date)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
