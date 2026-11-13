"use client";

import { type JSX, type ReactNode, useMemo } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/components/surface";
import { RADIUS } from "@/design/foundations/geometry";
import { cn } from "@/design/ui";
import { formatCompactAge } from "@/features/account/account";
import { RatingStars } from "@/features/reviews/rating";
import {
  accountHref,
  listHref,
  mediaHref,
  movieReviewsHref,
  reviewHref,
} from "@/lib/project";
import { ActivityCalendar } from "./calendar";
import {
  ACTIVITY_ICONS,
  ACTIVITY_KINDS,
  ACTIVITY_TONES,
  STAT_LABEL_CLASS,
  STRONG_CLASS,
} from "./constants";
import { AccountPart, AccountSection } from "./motion";
import { useAccountDock } from "./shell";
import type { ActivityItem, ActivitySummary } from "./types";
import { posterImage } from "./utils";

function episodeSummary(item: ActivityItem): string {
  const count = item.episodes?.count ?? 1;
  if (count > 1) return `${count} episodes`;
  const { episode, season } = item.episodes ?? {};
  return season !== undefined && episode !== undefined
    ? `S${season} · E${episode}`
    : "an episode";
}

function activityHref(item: ActivityItem, actor: string): string | null {
  if (!item.tmdbId) return null;
  if (item.type === "REVIEW_PUBLISHED") {
    return reviewHref(item.tmdbId, actor, item.mediaType);
  }
  if (item.type === "REVIEW_LIKED") {
    return item.target
      ? reviewHref(item.tmdbId, item.target.username, item.mediaType)
      : movieReviewsHref(item.tmdbId, {}, item.mediaType);
  }
  return mediaHref(item.mediaType, item.tmdbId);
}

function describeActivity(item: ActivityItem, actor: string): ReactNode {
  const href = activityHref(item, actor);
  const movie = href ? (
    <DockLink className={STRONG_CLASS} href={href}>
      {item.title ?? (item.mediaType === "tv" ? "a show" : "a movie")}
    </DockLink>
  ) : (
    <span className="font-medium text-ink">{item.title ?? "a movie"}</span>
  );
  const list =
    item.list && item.listOwner ? (
      <DockLink
        className={STRONG_CLASS}
        href={listHref(item.listOwner, item.list.slug)}
      >
        {item.list.title}
      </DockLink>
    ) : (
      <span className="font-medium text-ink">
        {item.list?.title ?? "a list"}
      </span>
    );
  const target = item.target ? (
    <DockLink className={STRONG_CLASS} href={accountHref(item.target.username)}>
      {item.target.displayName}
    </DockLink>
  ) : (
    <span>someone</span>
  );
  const stars = item.rating ? (
    <>
      {" "}
      <RatingStars rating={item.rating} />
    </>
  ) : null;

  switch (item.type) {
    case "WATCH_DIARY_LOGGED":
      return <>logged {movie}</>;
    case "WATCH_DIARY_REWATCHED":
      return <>rewatched {movie}</>;
    case "WATCHED_ADDED":
      return <>marked {movie} as watched</>;
    case "SHOW_COMPLETED":
      return <>finished {movie}</>;
    case "SHOW_STARTED":
      return <>started watching {movie}</>;
    case "EPISODE_WATCHED":
    case "SEASON_WATCHED":
      return (
        <>
          watched {episodeSummary(item)} of {movie}
        </>
      );
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

const DAY_MS = 86_400_000;

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});
const MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function dayLabel(key: string): string {
  const now = Date.now();
  const date = Date.parse(key);
  const ago = Math.round((now - (now % DAY_MS) - date) / DAY_MS);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago > 1 && ago < 7) return WEEKDAY_FORMAT.format(date);
  const sameYear =
    new Date(date).getUTCFullYear() === new Date(now).getUTCFullYear();
  return (sameYear ? MONTH_DAY_FORMAT : FULL_DATE_FORMAT).format(date);
}

function groupByDay(items: readonly ActivityItem[]) {
  const groups: { items: ActivityItem[]; key: string }[] = [];
  for (const item of items) {
    const key = item.createdAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ items: [item], key });
  }
  return groups;
}

export function ActivityRow({
  actor,
  index = 0,
  item,
}: {
  actor: { displayName: string; username: string };
  index?: number;
  item: ActivityItem;
}): JSX.Element {
  return (
    <AccountPart
      as="li"
      className="relative flex items-center gap-fib-4 py-fib-3"
      index={index}
      name="row"
    >
      <span
        aria-hidden="true"
        className={cn(
          "center relative z-10 size-fib-5 shrink-0 rounded-full bg-plate ring-1 ring-edge-hover ring-inset",
          ACTIVITY_TONES[item.type] ?? "text-ink-body",
        )}
      >
        <Icon icon={ACTIVITY_ICONS[item.type] ?? "solar:bolt-bold"} size={15} />
      </span>

      {item.tmdbId ? (
        <MediaCard
          aspect="free"
          className="w-fib-6 shrink-0"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconSize={18}
          frameClassName="h-[5.15625rem] w-fib-6"
          href={activityHref(item, actor.username) ?? undefined}
          image={posterImage(item.posterPath, "56px")}
          label={item.title ?? "Movie"}
          radius={RADIUS.thumb}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-fib-1">
        <p className="type-body leading-6 text-ink-body">
          <DockLink className={STRONG_CLASS} href={accountHref(actor.username)}>
            {actor.displayName}
          </DockLink>{" "}
          {describeActivity(item, actor.username)}
        </p>
        <p className="type-meta text-ink-muted">
          {ACTIVITY_KINDS[item.type] ?? "Activity"}
          <span aria-hidden="true" className="mx-fib-2 text-ink-faint">
            •
          </span>
          <time className="tabular-nums" dateTime={item.createdAt}>
            {formatCompactAge(item.createdAt)}
          </time>
        </p>
      </div>
    </AccountPart>
  );
}

export function ActivityTimeline({
  actor,
  items,
}: {
  actor: { displayName: string; username: string };
  items: readonly ActivityItem[];
}): JSX.Element {
  let index = 0;
  return (
    <div className="flex flex-col gap-fib-5">
      {groupByDay(items).map((group) => (
        <AccountSection as="section" cue="rows" key={group.key}>
          <header className="pb-fib-2">
            <AccountPart as="h3" className={STAT_LABEL_CLASS} name="label">
              {dayLabel(group.key)}
            </AccountPart>
          </header>
          <ul className="relative before:absolute before:inset-y-0 before:left-[calc(var(--spacing-fib-5)/2)] before:w-px before:bg-line">
            {group.items.map((item) => (
              <ActivityRow
                actor={actor}
                index={Math.min(index++, 12)}
                item={item}
                key={item.id}
              />
            ))}
          </ul>
        </AccountSection>
      ))}
    </div>
  );
}

function PulseAction({ summary }: { summary: ActivitySummary }): JSX.Element {
  const actionClass = useDockActionClass();
  const cell = actionClass({
    className: "min-w-0 flex-1 cursor-default gap-fib-2 px-2",
  });
  const figures = [
    { label: "7d", title: "Last 7 days", value: summary.week },
    { label: "30d", title: "Last 30 days", value: summary.month },
    { label: "1y", title: "Last year", value: summary.year },
  ];

  return (
    <DockAction>
      <div className="flex w-full items-center gap-2.5">
        {figures.map((figure) => (
          <span className={cell} key={figure.label} title={figure.title}>
            <span className="font-semibold text-ink tabular-nums">
              {figure.value.toLocaleString("en-US")}
            </span>
            <span className="text-ink-muted">{figure.label}</span>
          </span>
        ))}
      </div>
    </DockAction>
  );
}

export function ActivityChrome({
  summary,
}: {
  summary: ActivitySummary;
}): null {
  const dock = useMemo(
    () => ({ action: <PulseAction summary={summary} /> }),
    [summary],
  );
  useAccountDock(dock);
  return null;
}

export function ActivityRhythm({
  summary,
}: {
  summary: ActivitySummary;
}): JSX.Element {
  return (
    <AccountSection as="div" className="w-full" cue="activity">
      <ActivityCalendar days={summary.days} period="the last 2 years" />
    </AccountSection>
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
          {describeActivity(item, actor.username)}{" "}
          <time
            className="type-meta whitespace-nowrap text-ink-muted tabular-nums"
            dateTime={item.createdAt}
          >
            {formatCompactAge(item.createdAt)}
          </time>
        </AccountPart>
      ))}
    </ol>
  );
}
