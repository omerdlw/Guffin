"use client";

import {
  type JSX,
  type PointerEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatShortDate, timeAgo } from "@/features/account/utils";
import { ReviewActions } from "@/features/reviews/controls";
import { RatingStars } from "@/features/reviews/rating";
import { accountHref, listHref, movieHref, reviewHref } from "@/lib/project";
import { AccountLink, Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Icon, MediaCard } from "@/ui/media";
import { RADIUS } from "@/ui/tokens";
import {
  ACTIVITY_DATE_FORMAT,
  ACTIVITY_ICONS,
  CALENDAR_CELL,
  CALENDAR_LEVELS,
  CALENDAR_MONTH_FORMAT,
  DAY_MS,
  STRONG_CLASS,
} from "./constants";
import { AccountPart } from "./motion";
import type {
  ActivityDays,
  ActivityItem,
  ActivityReview,
  CalendarDay,
} from "./types";
import { countLabel, leveller, posterImage } from "./utils";

export function ActivityCalendar({
  days,
}: {
  days: ActivityDays;
}): JSX.Element {
  const { total, weeks } = useMemo(() => {
    const level = leveller(days.counts);
    const from = Date.parse(`${days.from}T00:00:00Z`);
    const weeks: { days: (CalendarDay | null)[]; month: string | null }[] = [];
    days.counts.forEach((count, index) => {
      if (index % 7 === 0) weeks.push({ days: [], month: null });
      const week = weeks[weeks.length - 1];
      const date = new Date(from + index * DAY_MS);
      if (date.getUTCDate() === 1)
        week.month = CALENDAR_MONTH_FORMAT.format(date);
      week.days.push({ count, date, level: level(count) });
    });
    const last = weeks[weeks.length - 1];
    while (last && last.days.length < 7) last.days.push(null);
    return {
      total: days.counts.reduce((sum, count) => sum + count, 0),
      weeks,
    };
  }, [days]);

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
          aria-label={`${countLabel(total, "activity", "activities")} in the last year`}
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
              ? countLabel(hover.day.count, "activity", "activities")
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

function sentence(item: ActivityItem): ReactNode {
  const movie = item.tmdbId ? (
    <AccountLink className={STRONG_CLASS} href={movieHref(item.tmdbId)}>
      {item.title ?? "a movie"}
    </AccountLink>
  ) : (
    <span className="font-medium text-ink">{item.title ?? "a movie"}</span>
  );
  const list =
    item.list && item.listOwner ? (
      <AccountLink
        className={STRONG_CLASS}
        href={listHref(item.listOwner, item.list.slug)}
      >
        {item.list.title}
      </AccountLink>
    ) : (
      <span className="font-medium text-ink">
        {item.list?.title ?? "a list"}
      </span>
    );
  const target = item.target ? (
    <AccountLink
      className={STRONG_CLASS}
      href={accountHref(item.target.username)}
    >
      {item.target.displayName}
    </AccountLink>
  ) : (
    <span>someone</span>
  );
  const stars = item.rating ? (
    <RatingStars className="mx-1" rating={item.rating} />
  ) : null;

  switch (item.type) {
    case "WATCH_DIARY_LOGGED":
      return <>logged {movie}</>;
    case "WATCH_DIARY_REWATCHED":
      return <>rewatched {movie}</>;
    case "WATCHED_ADDED":
      return <>marked {movie} as watched</>;
    case "WATCHLIST_ADDED":
      return <>added {movie} to the watchlist</>;
    case "LIKED_ADDED":
      return <>liked {movie}</>;
    case "REVIEW_PUBLISHED":
      return (
        <>
          reviewed {movie}
          {stars}
        </>
      );
    case "RATING_LOGGED":
      return (
        <>
          rated {movie}
          {stars}
        </>
      );
    case "REVIEW_LIKED":
      return item.tmdbId ? (
        <>liked a review of {movie}</>
      ) : (
        <>liked a comment on {list}</>
      );
    case "LIST_CREATED":
      return <>created the list {list}</>;
    case "LIST_LIKED":
      return (
        <>
          liked the list {list} by {target}
        </>
      );
    case "LIST_COMMENTED":
      return (
        <>
          commented on {list} by {target}
        </>
      );
    case "FOLLOW_CREATED":
      return <>started following {target}</>;
    default:
      return <>did something</>;
  }
}

export function ActivityRow({
  actor,
  item,
}: {
  actor: { displayName: string; username: string };
  item: ActivityItem;
}): JSX.Element {
  return (
    <li className="flex items-center gap-3 py-3.5 sm:gap-4">
      {item.tmdbId ? (
        <MediaCard
          aspect="free"
          className="w-9 shrink-0"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconSize={14}
          frameClassName="h-[3.25rem] w-9"
          href={movieHref(item.tmdbId)}
          image={posterImage(item.posterPath, "36px")}
          label={item.title ?? "Movie"}
          radius={RADIUS.thumb}
        />
      ) : (
        <span className="center size-9 shrink-0 rounded-thumb bg-fill text-ink-body">
          <Icon
            icon={ACTIVITY_ICONS[item.type] ?? "solar:bolt-bold"}
            size={15}
          />
        </span>
      )}
      <p className="min-w-0 flex-1 type-body leading-6 text-ink-body">
        <AccountLink
          className={STRONG_CLASS}
          href={accountHref(actor.username)}
        >
          {actor.displayName}
        </AccountLink>{" "}
        {sentence(item)}
      </p>
      <time
        className="shrink-0 type-meta text-ink-muted tabular-nums"
        dateTime={item.createdAt}
      >
        {timeAgo(item.createdAt)}
      </time>
    </li>
  );
}

export function ActivityFeed({
  actor,
  items,
}: {
  actor: { displayName: string; username: string };
  items: readonly ActivityItem[];
}): JSX.Element {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <AccountPart
          as="li"
          className="relative border-l border-line pb-4 pl-4 type-control leading-5 text-ink-muted last:border-transparent last:pb-0"
          index={index}
          key={item.id}
          name="row"
        >
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[3.5px] size-1.5 rounded-full bg-ink-muted"
          />
          <span className="font-medium text-ink-lead">{actor.displayName}</span>{" "}
          {sentence(item)}{" "}
          <time
            className="type-meta whitespace-nowrap text-ink-muted tabular-nums"
            dateTime={item.createdAt}
          >
            {timeAgo(item.createdAt)}
          </time>
        </AccountPart>
      ))}
    </ol>
  );
}

export function ActivityLog({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn("divide-y divide-rule", className)}>{children}</ul>;
}

function Body({ review }: { review: ActivityReview }) {
  const [revealed, setRevealed] = useState(false);
  if (!review.content.trim()) return null;
  if (review.isSpoiler && !revealed) {
    return (
      <p className="type-body leading-6 text-ink-muted italic">
        This review may contain spoilers.{" "}
        <Button
          className="cursor-pointer font-medium text-ink-body not-italic underline-offset-2 hover:text-ink focus-visible:text-ink underline decoration-transparent hover:decoration-current focus-visible:decoration-current"
          onClick={() => setRevealed(true)}
          type="button"
        >
          Show it anyway
        </Button>
      </p>
    );
  }
  return (
    <p className="line-clamp-6 type-body leading-6 whitespace-pre-line text-pretty text-ink-body">
      {review.content}
    </p>
  );
}

function ReviewRow({
  index,
  isOwner,
  review,
  signedIn,
  staged,
  username,
}: {
  index: number;
  isOwner: boolean;
  review: ActivityReview;
  signedIn: boolean;
  staged: boolean;
  username: string;
}) {
  const href = movieHref(review.tmdbId);
  const body = (
    <>
      <MediaCard
        aspect="free"
        className="w-14 shrink-0 sm:w-[4.5rem]"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={16}
        frameClassName="aspect-[2/3] w-full"
        href={href}
        image={posterImage(review.posterPath, "72px")}
        label={review.year ? `${review.title} (${review.year})` : review.title}
        radius={RADIUS.tile}
      />
      <article className="flex min-w-0 flex-1 flex-col">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <AccountLink
            className="type-base font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current sm:type-title"
            href={href}
          >
            {review.title}
          </AccountLink>
          {review.year ? (
            <span className="type-body text-ink-muted tabular-nums">
              {review.year}
            </span>
          ) : null}
        </h3>
        <p className="mt-1 flex items-center gap-3 type-meta text-ink-muted">
          {review.rating ? (
            <RatingStars rating={review.rating} size={12} />
          ) : null}
          <AccountLink
            aria-label={`Read this review of ${review.title} on its page`}
            className="hover:text-ink focus-visible:text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
            href={reviewHref(review.tmdbId, username)}
          >
            <time dateTime={review.updatedAt}>
              {formatShortDate(review.updatedAt)}
            </time>
          </AccountLink>
        </p>
        {review.content.trim() ? (
          <div className="mt-3">
            <Body review={review} />
          </div>
        ) : null}
        <footer className="mt-2 -ml-2 flex items-center">
          <ReviewActions
            id={review.id}
            isOwner={isOwner}
            liked={review.liked}
            likesCount={review.likesCount}
            signedIn={signedIn}
          />
        </footer>
      </article>
    </>
  );
  const className = "flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5";
  return staged ? (
    <AccountPart as="li" className={className} index={index} name="row">
      {body}
    </AccountPart>
  ) : (
    <li className={className}>{body}</li>
  );
}

export function ReviewList({
  className,
  isOwner,
  reviews,
  signedIn,
  staged = false,
  username,
}: {
  className?: string;
  isOwner: boolean;
  reviews: readonly ActivityReview[];
  signedIn: boolean;
  staged?: boolean;
  username: string;
}): JSX.Element {
  return (
    <ul className={cn("flex flex-col divide-y divide-rule", className)}>
      {reviews.map((review, index) => (
        <ReviewRow
          index={index}
          isOwner={isOwner}
          key={review.id}
          review={review}
          signedIn={signedIn}
          staged={staged}
          username={username}
        />
      ))}
    </ul>
  );
}
