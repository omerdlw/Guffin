import type { ComponentProps, JSX, ReactNode } from "react";
import { Avatar, Button, Image } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { Tooltip } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { RatingStars, Star } from "@/features/reviews/rating";
import { pluralize } from "@/lib/format";
import { accountHref, mediaHref, movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Pagination, TileActions } from "./controls";
import { AccountPart, AccountSection } from "./motion";
import {
  type DiaryEntry,
  type MediaItem,
  type PersonPreview,
  posterImage,
  PROFILE_GRID,
  STAT_LABEL_CLASS,
  type TileSource,
} from "./profile";
import { AccountPage } from "./shell";

type SectionCue = ComponentProps<typeof AccountSection>["cue"];

interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

const STAT_AFTER_CLASS = `${TONE.label} tabular-nums`;

const STAT_CELL_CLASS =
  "group/stat flex w-full flex-col items-center gap-1 px-2";

const DIARY_DIGEST_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const PEOPLE_COLUMNS = 6;

const POSTER_STACK_SLOTS = 5;

const STAR_COUNT = 5;

const starsLabel = (value: number) =>
  `${"★".repeat(Math.floor(value))}${value % 1 ? "½" : ""}`;

export function ViewAll({
  href,
  label = "All",
}: {
  href: string;
  label?: string;
}): JSX.Element {
  return (
    <DockLink
      className={cn(
        STAT_AFTER_CLASS,
        "text-ink-muted hover:text-ink focus-visible:text-ink",
      )}
      href={href}
    >
      {label}
    </DockLink>
  );
}

export function Section({
  action,
  children,
  className,
  cue = "rows",
  summary,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  cue?: SectionCue;
  summary?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <AccountSection
      className={cn("flex w-full min-w-0 flex-col", className)}
      cue={cue}
    >
      <header className="relative mb-fib-3 flex min-h-fib-5 items-end justify-between gap-fib-4 pb-fib-2">
        <AccountPart as="h2" className={STAT_LABEL_CLASS} name="label">
          {title}
        </AccountPart>
        {summary || action ? (
          <AccountPart
            className="flex shrink-0 items-center gap-fib-4"
            name="label"
          >
            {summary ? (
              <span className={cn(STAT_AFTER_CLASS, "text-ink-muted")}>
                {summary}
              </span>
            ) : null}
            {action}
          </AccountPart>
        ) : null}
        <AccountPart
          className="absolute inset-x-0 bottom-0 h-px bg-line"
          name="rule"
        />
      </header>
      {children}
    </AccountSection>
  );
}

export function CountLink({
  count,
  href,
}: {
  count: number;
  href: string;
}): JSX.Element {
  return <ViewAll href={href} label={count.toLocaleString("en-US")} />;
}

export function EmptyState({
  children,
  icon = "solar:ghost-bold",
}: {
  children: string;
  icon?: string;
}): JSX.Element {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-sheet bg-fill p-8 text-center ring-1 ring-edge ring-inset">
      <div className="center size-12 rounded-full bg-fill text-ink-muted ring-1 ring-edge-hover ring-inset">
        <Icon icon={icon} size={24} />
      </div>
      <p className="max-w-xs type-meta text-ink-muted sm:type-body">
        {children}
      </p>
    </div>
  );
}

function Figure({ count, label }: { count: number; label: string }) {
  return (
    <>
      <span className="type-title font-semibold text-ink tabular-nums sm:type-heading">
        {count.toLocaleString("en-US")}
      </span>
      <span className="type-micro font-semibold whitespace-nowrap text-ink-muted uppercase group-hover/stat:text-ink-body group-focus-visible/stat:text-ink-body group-has-focus-visible/stat:text-ink-body tracking-[0.04em]">
        {label}
      </span>
    </>
  );
}

function ProfileStatLink({ count, href, label }: ProfileStat) {
  return (
    <AccountPart as="li" className="flex justify-center" name="stat">
      <DockLink className={STAT_CELL_CLASS} href={href}>
        <Figure count={count} label={label} />
      </DockLink>
    </AccountPart>
  );
}

export function ProfileStatButton({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <AccountPart as="li" className="flex justify-center" name="stat">
      <Button
        className={cn(STAT_CELL_CLASS, "cursor-pointer")}
        onClick={onClick}
        type="button"
      >
        <Figure count={count} label={label} />
      </Button>
    </AccountPart>
  );
}

export function ProfileStats({
  stats,
}: {
  stats: readonly ProfileStat[];
}): JSX.Element {
  return (
    <>
      {stats.map((stat) => (
        <ProfileStatLink key={stat.label} {...stat} />
      ))}
    </>
  );
}

export function ProfileStatRow({ children }: { children: ReactNode }) {
  return (
    <div className="@container w-full">
      <ul className="grid grid-cols-3 gap-y-fib-4 [&>li]:border-rule [&>li:not(:nth-child(3n+1))]:border-l @lg:flex @lg:[&>li]:flex-auto @lg:[&>li+li]:border-l">
        {children}
      </ul>
    </div>
  );
}

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
    <div className="flex flex-col gap-fib-4">
      {months.map((month, monthIndex) => {
        const date = new Date(`${month.key}-01T00:00:00Z`);
        return (
          <AccountPart
            className="flex gap-fib-3"
            index={monthIndex}
            key={month.key}
            name="row"
          >
            <span className="flex w-fib-5 shrink-0 flex-col items-center self-start overflow-hidden rounded-thumb ring-1 ring-edge-focus ring-inset">
              <span className="w-full bg-fill-hover py-0.5 text-center type-micro font-semibold tracking-label text-ink-body uppercase">
                {DIARY_DIGEST_MONTH_FORMAT.format(date)}
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
                  <DockLink
                    className="truncate text-ink-body hover:text-ink focus-visible:text-ink"
                    href={movieHref(entry.tmdbId)}
                  >
                    {entry.title}
                  </DockLink>
                </li>
              ))}
            </ol>
          </AccountPart>
        );
      })}
    </div>
  );
}

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
    <div className="flex flex-col gap-fib-4">
      <AccountPart className="flex items-baseline gap-fib-3" name="row">
        <span className="type-display-xs leading-none font-semibold text-ink tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="flex flex-col gap-1.5">
          <RatingStars rating={Math.round(average * 2) / 2} size={12} />
          <span className="type-label leading-3 text-ink-muted">
            average rating
          </span>
        </span>
      </AccountPart>
      <AccountPart className="flex flex-col gap-1.5" name="row">
        <div className="flex h-fib-7 items-end gap-fib-1 border-b border-line">
          {spread.map((count, index) => (
            <AccountPart
              as="span"
              className="flex h-full flex-1 items-end"
              index={index}
              key={index}
              name="bar"
            >
              <Tooltip
                text={`${starsLabel((index + 1) / 2)} · ${pluralize(count, "rating")}`}
                triggerClassName="group/bar flex h-full w-full items-end"
              >
                {count ? (
                  <span
                    className={cn(
                      "w-full rounded-t-mark group-hover/bar:bg-ink-muted group-focus-visible/bar:bg-ink-muted group-has-focus-visible/bar:bg-ink-muted",
                      count === peak ? "bg-ink-faint" : "bg-fill-active",
                    )}
                    style={{ height: `max(4px, ${(count / peak) * 100}%)` }}
                  />
                ) : null}
              </Tooltip>
            </AccountPart>
          ))}
        </div>
        <div aria-hidden="true" className="flex justify-between">
          <Star fill={1} size={9} />
          <span className="flex gap-px">
            {Array.from({ length: STAR_COUNT }, (_, index) => (
              <Star fill={1} key={index} size={9} />
            ))}
          </span>
        </div>
      </AccountPart>
    </div>
  );
}

export function PeopleGrid({
  people,
}: {
  people: readonly PersonPreview[];
}): JSX.Element {
  const full = people.length - (people.length % PEOPLE_COLUMNS);
  const shown = full > 0 ? people.slice(0, full) : people;
  return (
    <ul className="grid grid-cols-6 gap-fib-2">
      {shown.map((person, index) => (
        <AccountPart as="li" index={index} key={person.username} name="face">
          <Tooltip text={person.displayName} triggerClassName="block">
            <DockLink
              aria-label={person.displayName}
              className="block aspect-square overflow-hidden rounded-full ring-1 ring-edge-hover ui-fade hover:opacity-80 focus-visible:opacity-80"
              href={accountHref(person.username)}
            >
              <Avatar
                className="rounded-full"
                name={person.displayName}
                size="100%"
                src={person.avatarUrl ?? undefined}
              />
            </DockLink>
          </Tooltip>
        </AccountPart>
      ))}
    </ul>
  );
}

export function PosterTile({
  index = 0,
  item,
  rank,
  source,
  staged = false,
}: {
  index?: number;
  item: MediaItem;
  rank?: number;
  source?: TileSource | null;
  staged?: boolean;
}) {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  const body = (
    <>
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        href={mediaHref(item.mediaType ?? "movie", item.tmdbId)}
        image={posterImage(item.posterPath)}
        label={label}
        radius={RADIUS.card}
        tooltip={item.pinned ? `${label} · Favorite` : label}
      />
      {rank !== undefined ? (
        <span className="pointer-events-none absolute top-2 left-2 center h-6 min-w-6 rounded-thumb bg-glass px-1.5 type-label font-semibold text-ink tabular-nums ring-1 ring-edge-hover">
          {rank}
        </span>
      ) : null}
      {source ? (
        <TileActions
          pinned={item.pinned}
          source={source}
          title={item.title}
          tmdbId={item.tmdbId}
        />
      ) : null}
    </>
  );
  const className = "group/tile relative min-w-0";
  return staged ? (
    <AccountPart as="li" className={className} index={index} name="tile">
      {body}
    </AccountPart>
  ) : (
    <li className={className}>{body}</li>
  );
}

export function PosterGrid({
  className,
  items,
  numberFrom,
  source,
  staged = false,
}: {
  className?: string;
  items: readonly MediaItem[];
  numberFrom?: number;
  source?: TileSource | null;
  staged?: boolean;
}): JSX.Element {
  return (
    <ul className={cn(PROFILE_GRID, className)}>
      {items.map((item, index) => (
        <PosterTile
          index={index}
          item={item}
          key={item.tmdbId}
          staged={staged}
          rank={numberFrom !== undefined ? numberFrom + index : undefined}
          source={source}
        />
      ))}
    </ul>
  );
}

export function PosterStack({
  className,
  paths,
}: {
  className?: string;
  paths: readonly (string | null)[];
}): JSX.Element {
  return (
    <div aria-hidden="true" className={cn("flex w-full", className)}>
      {Array.from({ length: POSTER_STACK_SLOTS }, (_, index) => {
        const path = paths[index] ?? null;
        return (
          <div
            className="relative aspect-[2/3] w-[28%] shrink-0 overflow-hidden rounded-thumb bg-plate not-first:-ml-[10%]"
            key={index}
            style={{ zIndex: POSTER_STACK_SLOTS - index }}
          >
            {path ? (
              <Image
                alt=""
                className="object-cover"
                sizes="96px"
                src={tmdbImageUrl("poster", path, "w185")}
              />
            ) : null}
            <span className="absolute inset-0 rounded-[inherit] ring-1 ring-edge-hover ring-inset" />
          </div>
        );
      })}
    </div>
  );
}

export function ResultsView({
  children,
  empty,
  paging,
  toolbar,
}: {
  children?: ReactNode;
  empty: { icon: string; message: string } | null;
  paging?: { page: number; pageCount: number };
  toolbar?: ReactNode;
}): JSX.Element {
  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        {toolbar}
        {empty ? (
          <EmptyState icon={empty.icon}>{empty.message}</EmptyState>
        ) : (
          <>
            {children}
            {paging ? (
              <Pagination page={paging.page} pageCount={paging.pageCount} />
            ) : null}
          </>
        )}
      </div>
    </AccountPage>
  );
}
