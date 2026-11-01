import type { JSX } from "react";
import { movieHref, reviewHref } from "@/config/routes";
import { Icon, MediaCard, RADIUS, TONE } from "@/ui";
import { RatingStars } from "@/features/reviews";
import type { DiaryRow } from "../browse-types";
import { AccountLink } from "./link";
import { DiaryDeleteButton } from "./diary-delete-button";
import { posterImage } from "../poster";

const DAY = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
  weekday: "short",
});

function dayOf(value: string) {
  const parts = DAY.formatToParts(new Date(`${value}T00:00:00Z`));
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

export const DIARY_COLUMNS =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_7rem_4.5rem_4.5rem_2.5rem] sm:gap-x-4";

const HEAD = `${TONE.label} text-ink-muted`;

function Mark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <Icon
      aria-label={label}
      className="text-ink-body"
      icon="solar:check-circle-bold"
      size={16}
    />
  ) : (
    <span aria-hidden="true" className="text-ink-faint">
      —
    </span>
  );
}

export function DiaryLedger({
  isOwner,
  rows,
  username,
}: {
  isOwner: boolean;
  rows: readonly DiaryRow[];
  username: string;
}): JSX.Element {
  return (
    <div className="w-full">
      <div
        className={`${DIARY_COLUMNS} hidden border-b border-line pb-2 sm:grid`}
      >
        <span className={HEAD}>Day</span>
        <span className={HEAD}>Film</span>
        <span className={HEAD}>Rating</span>
        <span className={`${HEAD} text-center`}>Rewatch</span>
        <span className={`${HEAD} text-center`}>Review</span>
        <span />
      </div>
      <ul className="divide-y divide-rule">
        {rows.map((row, index) => {
          const same = rows[index - 1]?.watchedOn === row.watchedOn;
          const { day, weekday } = dayOf(row.watchedOn);
          const href = movieHref(row.tmdbId);
          return (
            <li className={`${DIARY_COLUMNS} py-3`} key={row.id}>
              <time className="flex flex-col" dateTime={row.watchedOn}>
                {same ? null : (
                  <>
                    <span className="type-title leading-6 font-semibold text-ink tabular-nums">
                      {day}
                    </span>
                    <span className="type-label text-ink-muted">{weekday}</span>
                  </>
                )}
              </time>

              <div className="flex min-w-0 items-center gap-3">
                <MediaCard
                  aspect="free"
                  className="w-9 shrink-0"
                  fallbackIcon="solar:clapperboard-play-bold"
                  fallbackIconSize={14}
                  frameClassName="h-[3.25rem] w-9"
                  href={href}
                  image={posterImage(row.posterPath, "36px")}
                  label={row.title}
                  radius={RADIUS.thumb}
                />
                <div className="flex min-w-0 flex-col">
                  <AccountLink
                    className="truncate type-body font-medium text-ink underline decoration-transparent hover:decoration-current"
                    href={href}
                  >
                    {row.title}
                  </AccountLink>
                  <span className="flex items-center gap-2 type-meta text-ink-muted tabular-nums">
                    {row.year ?? ""}
                    <span className="inline-flex items-center gap-2 sm:hidden">
                      <RatingStars rating={row.rating} size={11} />
                      {row.isRewatch ? (
                        <Icon icon="solar:restart-linear" size={12} />
                      ) : null}
                    </span>
                  </span>
                </div>
              </div>

              <span className="hidden sm:block">
                <RatingStars rating={row.rating} />
              </span>
              <span className="hidden justify-center sm:flex">
                <Mark label="Rewatch" on={row.isRewatch} />
              </span>
              <span className="hidden justify-center sm:flex">
                {row.hasReview ? (
                  <AccountLink
                    aria-label="Read the review"
                    className="text-ink-body hover:text-ink"
                    href={reviewHref(row.tmdbId, username)}
                  >
                    <Icon icon="solar:document-text-bold" size={16} />
                  </AccountLink>
                ) : (
                  <Mark label="Review" on={false} />
                )}
              </span>
              <span className="flex justify-end">
                {isOwner ? (
                  <DiaryDeleteButton id={row.id} title={row.title} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
