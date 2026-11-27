"use client";

import {
  type JSX,
  type ReactNode,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { formatCompactAge, formatShortDate } from "@/features/account/model";
import { RatingStars } from "@/features/reviews/components/rating";
import { REVIEW_ICON } from "@/features/reviews/model";
import {
  accountHref,
  listHref,
  movieHref,
  movieReviewsHref,
  reviewHref,
} from "@/shared/site";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import type { ActivityGroup, ActivityItem, ActivityPage } from "../model";
import { loadActivityPage } from "../actions";

const STRONG =
  "font-medium text-ink underline decoration-transparent underline-offset-2 hover:decoration-current";

const KINDS: Record<string, { icon: string; label: string; tone: string }> = {
  LIKED_ADDED: { icon: "solar:heart-bold", label: "Like", tone: "text-liked" },
  LIST_COMMENTED: {
    icon: "solar:chat-round-bold",
    label: "Comment",
    tone: "text-ink-body",
  },
  LIST_CREATED: { icon: "solar:list-bold", label: "List", tone: "text-listed" },
  LIST_LIKED: {
    icon: "solar:heart-bold",
    label: "List like",
    tone: "text-liked",
  },
  RATING_LOGGED: {
    icon: "solar:star-bold",
    label: "Rating",
    tone: "text-rated",
  },
  REVIEW_LIKED: {
    icon: "solar:heart-bold",
    label: "Review like",
    tone: "text-liked",
  },
  REVIEW_PUBLISHED: {
    icon: REVIEW_ICON,
    label: "Review",
    tone: "text-rated",
  },
  WATCH_DIARY_LOGGED: {
    icon: "solar:calendar-mark-bold",
    label: "Diary",
    tone: "text-watched",
  },
  WATCH_DIARY_REWATCHED: {
    icon: "solar:restart-bold",
    label: "Rewatch",
    tone: "text-watched",
  },
  WATCHED_ADDED: {
    icon: "solar:eye-bold",
    label: "Watched",
    tone: "text-watched",
  },
  WATCHLIST_ADDED: {
    icon: "solar:bookmark-bold",
    label: "Watchlist",
    tone: "text-listed",
  },
};

const FALLBACK_KIND = {
  icon: "solar:bolt-bold",
  label: "Activity",
  tone: "text-ink-body",
};

function kindOf(item: ActivityItem) {
  if (item.type === "REVIEW_LIKED" && !item.tmdbId) {
    return { ...KINDS.REVIEW_LIKED, label: "Comment like" };
  }
  return KINDS[item.type] ?? FALLBACK_KIND;
}

function titleHref(item: ActivityItem, actor: string): string | null {
  if (!item.tmdbId) return null;
  if (item.type === "REVIEW_PUBLISHED") {
    return reviewHref(item.tmdbId, actor);
  }
  if (item.type === "REVIEW_LIKED") {
    return item.target
      ? reviewHref(item.tmdbId, item.target.username)
      : movieReviewsHref(item.tmdbId);
  }
  return movieHref(item.tmdbId);
}

function describe(item: ActivityItem, actor: string): ReactNode {
  const href = titleHref(item, actor);
  const fallback = "a film";
  const title = href ? (
    <DockLink className={STRONG} href={href}>
      {item.title ?? fallback}
    </DockLink>
  ) : (
    <span className="font-medium text-ink">{item.title ?? fallback}</span>
  );
  const list =
    item.list && item.listOwner ? (
      <DockLink
        className={STRONG}
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
    <DockLink className={STRONG} href={accountHref(item.target.username)}>
      {item.target.displayName}
    </DockLink>
  ) : (
    "someone"
  );
  const stars = item.rating ? (
    <RatingStars className="ml-fib-1 inline-flex" rating={item.rating} />
  ) : null;
  const edited = item.edited ? (
    <span className="text-ink-muted"> · edited</span>
  ) : null;

  switch (item.type) {
    case "WATCH_DIARY_LOGGED":
      return <>logged {title}</>;
    case "WATCH_DIARY_REWATCHED":
      return <>rewatched {title}</>;
    case "WATCHED_ADDED":
      return <>marked {title} as watched</>;
    case "WATCHLIST_ADDED":
      return <>added {title} to the watchlist</>;
    case "LIKED_ADDED":
      return <>liked {title}</>;
    case "REVIEW_PUBLISHED":
      return (
        <>
          reviewed {title}
          {stars}
          {edited}
        </>
      );
    case "RATING_LOGGED":
      return (
        <>
          rated {title}
          {stars}
          {edited}
        </>
      );
    case "REVIEW_LIKED":
      return item.tmdbId ? (
        <>
          liked {target}’s review of {title}
        </>
      ) : (
        <>
          liked {target}’s comment on {list}
        </>
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
          {edited}
        </>
      );
    default:
      return <>did something</>;
  }
}

const DAY_MS = 86_400_000;

const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});
const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const FULL_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

let clock: number | null = null;

function subscribeClock(change: () => void) {
  const tick = () => {
    clock = Date.now();
    change();
  };
  tick();
  const id = window.setInterval(tick, 60_000);
  return () => window.clearInterval(id);
}

const readClock = () => (clock ??= Date.now());

const useNow = (): number | null =>
  useSyncExternalStore(subscribeClock, readClock, () => null);

function Age({ value }: { value: string }): string {
  const now = useNow();
  return now === null ? formatShortDate(value) : formatCompactAge(value, now);
}

function DayLabel({ day }: { day: string }): string {
  const now = useNow();
  const date = Date.parse(day);
  if (now === null) return FULL_DATE.format(date);
  const ago = Math.round((now - (now % DAY_MS) - date) / DAY_MS);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago > 1 && ago < 7) return WEEKDAY.format(date);
  const sameYear =
    new Date(date).getUTCFullYear() === new Date(now).getUTCFullYear();
  return (sameYear ? MONTH_DAY : FULL_DATE).format(date);
}

function byDay(items: readonly ActivityItem[]) {
  const days: { items: ActivityItem[]; key: string }[] = [];
  for (const item of items) {
    const key = item.createdAt.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(item);
    else days.push({ items: [item], key });
  }
  return days;
}

function Row({
  actor,
  item,
}: {
  actor: { displayName: string; username: string };
  item: ActivityItem;
}): JSX.Element {
  const kind = kindOf(item);
  const href = titleHref(item, actor.username);

  return (
    <li
      className="relative flex items-center gap-fib-3 py-fib-2"
      data-part="row"
    >
      <span
        aria-hidden="true"
        className={cn(
          "center relative size-fib-5 shrink-0 rounded-full bg-plate ring-1 ring-edge-hover ring-inset",
          kind.tone,
        )}
      >
        <Icon icon={kind.icon} size={14} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-fib-1">
        <p className="type-body text-ink-body">
          <span className="font-medium text-ink">{actor.displayName}</span>{" "}
          {describe(item, actor.username)}
        </p>
        <p className="type-meta text-ink-faint">
          {kind.label}
          <span aria-hidden="true" className="mx-fib-1">
            ·
          </span>
          <time className="tabular-nums" dateTime={item.createdAt}>
            <Age value={item.createdAt} />
          </time>
        </p>
      </div>

      {item.tmdbId && item.posterPath ? (
        <MediaCard
          className="w-fib-5 shrink-0"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconSize={14}
          href={href ?? undefined}
          image={{
            sizes: "34px",
            src: tmdbImageUrl("poster", item.posterPath, "w92"),
            srcSet:
              tmdbImageSrcSet("poster", item.posterPath, ["w92", "w185"]) ??
              undefined,
          }}
          label={item.title ?? "Poster"}
          radius={RADIUS.mark}
        />
      ) : null}
    </li>
  );
}

export function ActivityTimeline({
  actor,
  group,
  page,
}: {
  actor: { displayName: string; username: string };
  group: ActivityGroup;
  page: ActivityPage;
}): JSX.Element {
  const [served, setServed] = useState(page);
  const [items, setItems] = useState(page.items);
  const [next, setNext] = useState(page.next);
  const [pending, startTransition] = useTransition();
  if (page !== served) {
    setServed(page);
    setItems(page.items);
    setNext(page.next);
  }

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      const result = await loadActivityPage({
        group,
        offset: next,
        username: actor.username,
      });
      setItems((current) => [...current, ...result.items]);
      setNext(result.next);
    });
  };

  return (
    <div className="flex flex-col gap-fib-5">
      {byDay(items).map((day) => (
        <section className="flex flex-col gap-fib-2" key={day.key}>
          <h3 className="type-label tracking-label text-ink-faint uppercase">
            <DayLabel day={day.key} />
          </h3>
          <ul className="relative before:absolute before:inset-y-fib-3 before:left-[calc(var(--spacing-fib-5)/2)] before:w-px before:bg-line">
            {day.items.map((item) => (
              <Row actor={actor} item={item} key={item.id} />
            ))}
          </ul>
        </section>
      ))}

      {next !== null ? (
        <button
          aria-busy={pending || undefined}
          className={cn(
            TONES.outline,
            "self-center rounded-full px-fib-4 h-control-sm type-control font-medium disabled:opacity-50",
          )}
          disabled={pending}
          onClick={more}
          type="button"
        >
          {pending ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
