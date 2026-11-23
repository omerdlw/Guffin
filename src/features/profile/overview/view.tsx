import type { CSSProperties, JSX, ReactNode } from "react";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { GLASS } from "@/design/foundations/layers";
import { cn } from "@/design/ui";
import { FAVORITES_MAX, type PublicAccount } from "@/features/account/account";
import { RatingStars, Star } from "@/features/reviews/rating";
import { isRated, REVIEW_ICON } from "@/features/reviews/review";
import { pluralize } from "@/shared/format";
import { accountHref, movieHref, reviewHref } from "@/shared/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/shared";
import { ActivityCalendar } from "../activity/calendar";
import { ListsShelf } from "../lists/shelf";
import { ReviewsList } from "../reviews/list";
import type { ReviewSummary } from "../reviews/reviews";
import { StatStrip } from "../stat-strip";
import type { ProfileNumbers } from "../stats";
import type { OverviewTitle, ProfileOverview, RecentTitle } from "./server";

const HEADING = "type-label tracking-label text-ink-faint uppercase";

const MORE =
  "inline-flex items-center gap-1 type-label tracking-label text-ink-muted uppercase tabular-nums hover:text-ink";

function Section({
  children,
  className,
  href,
  more,
  name,
  title,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  more?: string;
  name: string;
  title: string;
}): JSX.Element {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-fib-4", className)}
      data-section={name}
    >
      <header className="flex items-baseline justify-between gap-fib-3">
        <h2 className={HEADING}>{title}</h2>
        {href && more ? (
          <DockLink className={MORE} href={href}>
            {more}
            <Icon icon="solar:alt-arrow-right-linear" size={12} />
          </DockLink>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Poster({
  caption,
  item,
  sizes,
}: {
  caption?: ReactNode;
  item: OverviewTitle;
  sizes: string;
}): JSX.Element {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  return (
    <MediaCard
      caption={caption}
      fallbackIcon="solar:clapperboard-play-bold"
      fallbackIconSize={20}
      href={movieHref(item.tmdbId)}
      image={{
        sizes,
        src: tmdbImageUrl("poster", item.posterPath, "w342"),
        srcSet:
          tmdbImageSrcSet("poster", item.posterPath, [
            "w185",
            "w342",
            "w500",
          ]) ?? undefined,
      }}
      label={label}
      radius={RADIUS.card}
      tooltip={label}
    />
  );
}

function Favorites({
  href,
  isOwner,
  items,
}: {
  href: string;
  isOwner: boolean;
  items: OverviewTitle[];
}): JSX.Element | null {
  if (items.length === 0 && !isOwner) return null;
  const open = isOwner ? FAVORITES_MAX - items.length : 0;

  return (
    <Section
      href={isOwner ? href : undefined}
      more="Edit"
      name="favorites"
      title="Favorite films"
    >
      <ol className="grid grid-cols-5 gap-fib-2 sm:gap-fib-3">
        {items.map((item) => (
          <li className="min-w-0" data-part="favorite" key={item.tmdbId}>
            <Poster item={item} sizes="(min-width: 896px) 170px, 20vw" />
          </li>
        ))}
        {Array.from({ length: open }, (_, index) => (
          <li className="min-w-0" data-part="favorite" key={`open-${index}`}>
            <DockLink
              aria-label="Pin a favorite from your likes"
              className="center aspect-[2/3] rounded-card border border-dashed border-edge-hover text-ink-faint hover:border-edge-focus hover:text-ink-muted"
              href={href}
            >
              <Icon icon="solar:add-circle-linear" size={20} />
            </DockLink>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function RecentTile({
  item,
  username,
}: {
  item: RecentTitle;
  username: string;
}): JSX.Element {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  const marks = isRated(item.rating) || item.liked || item.hasReview;

  return (
    <li className="min-w-0" data-part="tile">
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={20}
        href={
          item.hasReview
            ? reviewHref(item.tmdbId, username)
            : movieHref(item.tmdbId)
        }
        image={{
          sizes: "(min-width: 896px) 210px, 45vw",
          src: tmdbImageUrl("poster", item.posterPath, "w342"),
          srcSet:
            tmdbImageSrcSet("poster", item.posterPath, ["w185", "w342"]) ??
            undefined,
        }}
        label={label}
        overlay={
          marks ? (
            <span
              className={cn(
                GLASS,
                "liquid-clear pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center px-fib-3 py-fib-3 [--rated-off:var(--rated-off-glass)]",
                item.tint
                  ? "liquid-poster"
                  : "[--liquid-tint:var(--liquid-tint-pure)]",
              )}
              style={
                {
                  "--poster": item.tint ?? undefined,
                  borderRadius: RADIUS.card,
                } as CSSProperties
              }
            >
              <span className="flex items-center gap-fib-2 text-ink-muted">
                {isRated(item.rating) ? (
                  <RatingStars rating={item.rating} size={14} />
                ) : null}
                {item.liked ? (
                  <Icon
                    aria-label="Liked"
                    className="text-liked"
                    icon="solar:heart-bold"
                    size={14}
                  />
                ) : null}
                {item.hasReview ? (
                  <Icon aria-label="Reviewed" icon={REVIEW_ICON} size={14} />
                ) : null}
              </span>
            </span>
          ) : undefined
        }
        tooltip={label}
        radius={RADIUS.card}
      />
    </li>
  );
}

function RecentActivity({
  href,
  items,
  username,
}: {
  href: string;
  items: RecentTitle[];
  username: string;
}): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <Section href={href} more="All" name="recent" title="Recent activity">
      <ul className="grid grid-cols-2 gap-fib-3 sm:grid-cols-4">
        {items.map((item) => (
          <RecentTile item={item} key={item.tmdbId} username={username} />
        ))}
      </ul>
    </Section>
  );
}

function Watchlist({
  href,
  items,
  total,
}: {
  href: string;
  items: OverviewTitle[];
  total: number;
}): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <Section
      href={href}
      more={
        total > items.length
          ? `All ${total.toLocaleString("en-US")}`
          : undefined
      }
      name="watchlist"
      title="Watchlist"
    >
      <ul className="grid grid-cols-5 gap-fib-2 sm:gap-fib-3">
        {items.map((item) => (
          <li className="min-w-0" data-part="tile" key={item.tmdbId}>
            <Poster item={item} sizes="(min-width: 896px) 170px, 20vw" />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Ratings({
  className,
  href,
  summary,
}: {
  className?: string;
  href: string;
  summary: ReviewSummary;
}): JSX.Element {
  const peak = Math.max(1, ...summary.distribution);
  const average = summary.average ?? 0;

  return (
    <Section
      className={className}
      href={href}
      more="All"
      name="ratings"
      title="Ratings"
    >
      <div className="flex flex-col gap-fib-4 rounded-card border border-edge p-fib-4">
        <div className="flex items-end justify-between gap-fib-3">
          <span className="font-zuume type-display-sm leading-none font-bold text-ink tabular-nums">
            {average.toFixed(1)}
          </span>
          <span className="flex flex-col items-end gap-fib-1 pb-1">
            <RatingStars rating={Math.round(average * 2) / 2} size={12} />
            <span className="type-meta text-ink-muted tabular-nums">
              {pluralize(summary.rated, "rating")}
            </span>
          </span>
        </div>
        <figure
          aria-label="How the ratings spread, half a star to five"
          className="flex flex-col gap-fib-2"
        >
          <ol className="flex h-fib-7 items-end gap-0.5">
            {summary.distribution.map((total, step) => (
              <li
                className={cn(
                  "flex-1 rounded-t-mark",
                  total > 0 ? "bg-rated" : "bg-fill",
                )}
                data-part="bar"
                key={step}
                style={{ height: `${Math.max(6, (total / peak) * 100)}%` }}
                title={`${(step + 1) / 2} stars: ${total}`}
              />
            ))}
          </ol>
          <span className="flex items-center justify-between">
            <Star fill={0.5} size={10} />
            <RatingStars rating={5} size={8} />
          </span>
        </figure>
      </div>
    </Section>
  );
}

export function ProfileOverviewView({
  account,
  isOwner,
  numbers,
  overview,
  signedIn,
}: {
  account: PublicAccount;
  isOwner: boolean;
  numbers: ProfileNumbers;
  overview: ProfileOverview;
  signedIn: boolean;
}): JSX.Element {
  const base = accountHref(account.username);
  const link = (path: string) => `${base}/${path}`;
  const { favorites, lists, recent, reviews, summary, watchlist } = overview;
  const rated = summary.rated > 0;

  return (
    <div className="flex flex-col gap-fib-6">
      <StatStrip account={account} stats={numbers.stats} />

      <ActivityCalendar days={numbers.activity} />

      <Favorites href={link("likes")} isOwner={isOwner} items={favorites} />

      <RecentActivity
        href={link("activity")}
        items={recent}
        username={account.username}
      />

      <Watchlist
        href={link("watchlist")}
        items={watchlist}
        total={numbers.stats.watchlist}
      />

      {reviews.length > 0 || rated ? (
        <div
          className={cn(
            "grid gap-fib-6",
            reviews.length > 0 &&
              rated &&
              "md:grid-cols-[minmax(0,1fr)_15rem] md:gap-fib-5",
          )}
        >
          {reviews.length > 0 ? (
            <Section
              href={link("reviews?kind=written")}
              more={
                summary.written > reviews.length
                  ? `All ${summary.written.toLocaleString("en-US")}`
                  : undefined
              }
              name="reviews"
              title="Recent reviews"
            >
              <ReviewsList
                isOwner={isOwner}
                kind="written"
                page={{ items: reviews, next: null }}
                signedIn={signedIn}
                sort="newest"
                username={account.username}
              />
            </Section>
          ) : null}
          {rated ? (
            <Ratings
              className={reviews.length > 0 ? undefined : "sm:max-w-sm"}
              href={link("reviews?kind=ratings")}
              summary={summary}
            />
          ) : null}
        </div>
      ) : null}

      {lists.length > 0 ? (
        <Section
          href={link("lists")}
          more={
            numbers.stats.lists > lists.length
              ? `All ${numbers.stats.lists.toLocaleString("en-US")}`
              : undefined
          }
          name="lists"
          title="Lists"
        >
          <ListsShelf
            empty={null}
            isOwner={false}
            page={{ items: lists, next: null }}
            query=""
            sort="updated"
            username={account.username}
          />
        </Section>
      ) : null}
    </div>
  );
}
