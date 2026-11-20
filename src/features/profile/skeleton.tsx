import type { JSX, ReactNode } from "react";
import { BACKDROP_HERO_MASK } from "@/design/components/backdrop";
import { DockClear } from "@/design/components/dock-clear";
import {
  SKELETON,
  SkeletonBlock,
  SkeletonLines,
  SkeletonText,
} from "@/design/components/skeleton";
import { RADIUS } from "@/design/foundations/geometry";
import { Z_INDEX } from "@/design/foundations/z-index";
import { cn } from "@/design/ui";
import { PosterStackSkeleton, range } from "@/features/detail/skeleton";
import { STAR_GAP } from "@/features/reviews/review";
import { LIBRARY_PAGE_SIZE } from "./library/library";
import { HERO_SIZES } from "./media";
import { REVIEWS_PAGE_SIZE } from "./reviews/reviews";

const HEADING = "type-label tracking-label uppercase";

const TABS = [
  "Overview",
  "Activity",
  "Films",
  "Diary",
  "Reviews",
  "Watchlist",
  "Lists",
  "Likes",
];

function StarsSkeleton({ size }: { size: number }): JSX.Element {
  return (
    <SkeletonBlock
      className="inline-block shrink-0 rounded-full"
      style={{
        height: size,
        marginInline: -size * 0.1425,
        verticalAlign: `calc(0.355em - ${size / 2}px)`,
        width: size * 5 + STAR_GAP * 4,
      }}
    />
  );
}

function PosterTileSkeleton({
  radius = RADIUS.card,
}: {
  radius?: number;
}): JSX.Element {
  return (
    <SkeletonBlock
      className="aspect-[2/3] w-full"
      style={{ borderRadius: radius }}
    />
  );
}

function QuietHeadingSkeleton({
  more,
  title,
}: {
  more?: string;
  title: string;
}): JSX.Element {
  return (
    <header className="flex items-baseline justify-between gap-fib-3">
      <SkeletonText as="h2" className={HEADING} text={title} />
      {more ? (
        <SkeletonText
          className={`inline-flex items-center gap-1 ${HEADING}`}
          text={`${more} →`}
        />
      ) : null}
    </header>
  );
}

function TabsSkeleton(): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 flex justify-center px-4 pt-fib-5 sm:px-6"
      style={{ zIndex: Z_INDEX.UI_ELEMENT }}
    >
      <div className={cn(SKELETON.soft, "flex rounded-full p-1")}>
        <div className="flex flex-wrap items-center justify-center">
          {TABS.map((label) => (
            <span
              className="center h-control-md rounded-full px-4 type-control font-medium whitespace-nowrap text-transparent select-none"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton(): JSX.Element {
  return (
    <section className={cn("relative isolate w-full", HERO_SIZES)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-(--hero)"
      >
        <div
          className={cn(SKELETON.block, "absolute inset-0")}
          style={BACKDROP_HERO_MASK}
        />
      </div>
      <div className="flex flex-col items-center px-4 pt-[calc(var(--hero)/2-var(--avatar)/2)] text-center sm:px-6">
        <SkeletonBlock className="size-(--avatar) shrink-0 rounded-full" />
        <SkeletonText
          as="h1"
          className="mt-fib-4 font-zuume type-display-sm leading-none font-bold uppercase sm:type-display-md"
          text="Account name"
        />
        <div className="mt-fib-4 w-full max-w-lg">
          <SkeletonLines
            className="type-body [&>*]:justify-center"
            phone={["100%", "62%"]}
            widths={["74%"]}
          />
        </div>
      </div>
    </section>
  );
}

export function ProfileHeadSkeleton(): JSX.Element {
  return (
    <>
      <span className="sr-only">Loading</span>
      <TabsSkeleton />
      <HeroSkeleton />
    </>
  );
}

export function ProfileFrameSkeleton({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <main aria-busy="true" className="min-h-screen" id="main">
      <DockClear extra="var(--spacing-fib-5)" />
      <ProfileHeadSkeleton />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-fib-5 px-4 pt-fib-5 sm:px-6">
        {children}
      </div>
    </main>
  );
}

const STATS = ["Films", "This year", "Lists", "Following", "Followers"];

function StatStripSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-5 divide-x divide-rule overflow-hidden rounded-card border border-edge">
      {STATS.map((label) => (
        <div
          className="flex min-w-0 flex-col-reverse items-center gap-fib-1 px-fib-1 py-fib-3"
          key={label}
        >
          <SkeletonText
            className="truncate type-micro tracking-label uppercase"
            text={label}
          />
          <SkeletonText
            className="font-zuume type-heading leading-none font-bold tabular-nums"
            text="100"
          />
        </div>
      ))}
    </div>
  );
}

const WEEKS = 53;
const NARROW_WEEKS = 26;
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

function CalendarSkeleton(): JSX.Element {
  return (
    <section className="flex flex-col gap-fib-4">
      <header className="flex items-baseline justify-between gap-fib-3">
        <SkeletonText as="h2" className={HEADING} text="Activity" />
        <SkeletonText
          className="type-meta tabular-nums"
          text="400 activities in the last year"
        />
      </header>
      <div className="grid grid-cols-[auto_repeat(26,minmax(0,1fr))] gap-[3px] sm:grid-cols-[auto_repeat(53,minmax(0,1fr))]">
        <div className="flex flex-col gap-[3px] pr-fib-1 type-micro">
          <span className="h-3" />
          {WEEKDAYS.map((label, index) => (
            <span className="flex flex-1 items-center" key={index}>
              {label ? <SkeletonText text={label} /> : null}
            </span>
          ))}
        </div>
        {range(WEEKS).map((week) => (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-[3px]",
              week < WEEKS - NARROW_WEEKS && "max-sm:hidden",
            )}
            key={week}
          >
            <span className="relative h-3">
              {week % 9 === 2 ? (
                <SkeletonText
                  className="absolute top-0 left-0 type-micro whitespace-nowrap"
                  text="Jan"
                />
              ) : null}
            </span>
            {range(7).map((day) => (
              <span
                className={cn(
                  SKELETON.soft,
                  "aspect-square w-full rounded-mark",
                )}
                key={day}
              />
            ))}
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-fib-3 type-label">
        <span className="flex gap-fib-4 tabular-nums">
          <SkeletonText text="Longest streak 10 days" />
          <SkeletonText text="Current 1 day" />
        </span>
        <SkeletonText
          className="flex items-center gap-1 max-sm:hidden"
          text="Less ▪ ▪ ▪ ▪ ▪ More"
        />
      </footer>
    </section>
  );
}

function FavoritesSkeleton(): JSX.Element {
  return (
    <section className="flex min-w-0 flex-col gap-fib-4">
      <QuietHeadingSkeleton title="Favorite films" />
      <ol className="grid grid-cols-5 gap-fib-2 sm:gap-fib-3">
        {range(5).map((index) => (
          <li className="min-w-0" key={index}>
            <PosterTileSkeleton />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PosterGridSkeleton({
  className,
  count,
  more,
  title,
}: {
  className: string;
  count: number;
  more?: string;
  title: string;
}): JSX.Element {
  return (
    <section className="flex min-w-0 flex-col gap-fib-4">
      <QuietHeadingSkeleton more={more} title={title} />
      <ul className={className}>
        {range(count).map((index) => (
          <li className="min-w-0" key={index}>
            <PosterTileSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

const phoneLines = (lines: readonly string[], stretch: number): string[] =>
  lines.length === 0
    ? []
    : [
        ...range(Math.round(lines.length * stretch) - 1).map(() => "100%"),
        "52%",
      ];

function ProfileReviewSkeleton({
  lines,
  stretch = 2.3,
}: {
  lines: readonly string[];
  stretch?: number;
}): JSX.Element {
  return (
    <li className="flex gap-fib-3 border-t border-rule py-fib-4 first:border-t-0 first:pt-0 sm:gap-fib-4">
      <div className="w-14 shrink-0 self-start sm:w-[4.5rem]">
        <PosterTileSkeleton radius={RADIUS.tile} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-fib-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-fib-2 gap-y-1">
          <StarsSkeleton size={14} />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-fib-2">
            <SkeletonText
              className="type-base font-semibold"
              text="A film of some length"
            />
            <SkeletonText className="type-meta tabular-nums" text="2000" />
          </div>
          <SkeletonText className="type-meta tabular-nums" text="Jan 1" />
        </div>
        <div className="flex max-w-[65ch] flex-col gap-fib-3">
          <SkeletonLines
            className="type-body leading-6"
            phone={phoneLines(lines, stretch)}
            widths={lines}
          />
        </div>
        <div className="-mb-2 -ml-2">
          <span className="flex h-control-sm items-center gap-1.5 px-2">
            <SkeletonBlock className="size-3.5 rounded-full" />
          </span>
        </div>
      </div>
    </li>
  );
}

const REVIEW_LINES = [
  ["100%", "100%", "100%", "100%", "100%", "100%", "38%"],
  ["100%", "100%", "100%", "100%", "100%", "100%", "100%", "56%"],
  ["100%", "100%", "100%", "70%"],
] as const;

function RatingsSkeleton(): JSX.Element {
  return (
    <section className="flex min-w-0 flex-col gap-fib-4">
      <QuietHeadingSkeleton more="All" title="Ratings" />
      <div className="flex flex-col gap-fib-4 rounded-card border border-edge p-fib-4">
        <div className="flex items-end justify-between gap-fib-3">
          <SkeletonText
            className="font-zuume type-display-sm leading-none font-bold tabular-nums"
            text="3.5"
          />
          <span className="flex flex-col items-end gap-fib-1 pb-1">
            <StarsSkeleton size={12} />
            <SkeletonText
              className="type-meta tabular-nums"
              text="100 ratings"
            />
          </span>
        </div>
        <div className="flex flex-col gap-fib-2">
          <div className="flex h-fib-7 items-end gap-0.5">
            {range(10).map((step) => (
              <SkeletonBlock
                className="flex-1 rounded-t-mark"
                key={step}
                style={{ height: `${12 + ((step * 41) % 80)}%` }}
              />
            ))}
          </div>
          <span className="flex items-center justify-between">
            <SkeletonBlock className="size-2.5 rounded-full" />
            <StarsSkeleton size={8} />
          </span>
        </div>
      </div>
    </section>
  );
}

function ListCardSkeleton(): JSX.Element {
  return (
    <li className="flex min-w-0 flex-col gap-fib-3">
      <PosterStackSkeleton />
      <div className="flex min-w-0 flex-col gap-fib-1">
        <SkeletonText
          as="h3"
          className="truncate type-base font-semibold"
          text="A list of films"
        />
        <SkeletonText
          as="p"
          className="type-meta tabular-nums"
          text="10 films · Jan 1"
        />
      </div>
    </li>
  );
}

function ListsGridSkeleton({ count }: { count: number }): JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-x-fib-5 gap-y-fib-6 sm:grid-cols-2 lg:grid-cols-3">
      {range(count).map((index) => (
        <ListCardSkeleton key={index} />
      ))}
    </ul>
  );
}

export function OverviewSkeleton(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-col gap-fib-6">
      <StatStripSkeleton />
      <CalendarSkeleton />
      <FavoritesSkeleton />
      <PosterGridSkeleton
        className="grid grid-cols-2 gap-fib-3 sm:grid-cols-4"
        count={4}
        more="All"
        title="Recent activity"
      />
      <PosterGridSkeleton
        className="grid grid-cols-5 gap-fib-2 sm:gap-fib-3"
        count={5}
        more="All 100"
        title="Watchlist"
      />
      <div className="grid gap-fib-6 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-fib-5">
        <section className="flex min-w-0 flex-col gap-fib-4">
          <QuietHeadingSkeleton more="All 10" title="Recent reviews" />
          <div className="flex flex-col gap-fib-5">
            <ul className="flex flex-col">
              {REVIEW_LINES.map((lines, index) => (
                <ProfileReviewSkeleton
                  key={index}
                  lines={lines}
                  stretch={1.6}
                />
              ))}
            </ul>
          </div>
        </section>
        <RatingsSkeleton />
      </div>
      <section className="flex min-w-0 flex-col gap-fib-4">
        <QuietHeadingSkeleton title="Lists" />
        <div className="flex flex-col gap-fib-5">
          <ListsGridSkeleton count={3} />
        </div>
      </section>
    </div>
  );
}

const ACTIVITY_CHIPS = [
  "All",
  "Diary",
  "Watched",
  "Reviews",
  "Likes",
  "Watchlist",
  "Lists",
  "Follows",
];

function ChipsSkeleton({ labels }: { labels: readonly string[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-fib-1">
      {labels.map((label, index) => (
        <span
          className={cn(
            "center h-control-sm rounded-full px-fib-3 type-control font-medium whitespace-nowrap text-transparent select-none",
            index === 0 && SKELETON.block,
          )}
          key={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

const ACTIVITY_DAYS = [4, 7, 3, 6, 2, 5, 3];
const EVENT_WIDTHS = ["62%", "48%", "74%", "55%", "40%", "68%"];

function EventSkeleton({ index }: { index: number }): JSX.Element {
  return (
    <li className="relative flex items-center gap-fib-3 py-fib-2">
      <span
        className={cn(
          SKELETON.solid,
          "relative size-fib-5 shrink-0 rounded-full ring-1 ring-edge-hover ring-inset",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-fib-1">
        <SkeletonLines
          className="type-body"
          phone={["100%", EVENT_WIDTHS[index % EVENT_WIDTHS.length]!]}
          widths={[EVENT_WIDTHS[index % EVENT_WIDTHS.length]!]}
        />
        <SkeletonText className="type-meta" text="Watched · 2h ago" />
      </div>
      <div className="w-fib-5 shrink-0">
        <PosterTileSkeleton radius={RADIUS.mark} />
      </div>
    </li>
  );
}

function TimelineSkeleton(): JSX.Element {
  let index = 0;
  return (
    <div className="flex flex-col gap-fib-5">
      {ACTIVITY_DAYS.map((count, day) => (
        <section className="flex flex-col gap-fib-2" key={day}>
          <SkeletonText as="h3" className={HEADING} text="Yesterday" />
          <ul className="relative before:absolute before:inset-y-fib-3 before:left-[calc(var(--spacing-fib-5)/2)] before:w-px before:bg-line">
            {range(count).map(() => (
              <EventSkeleton index={index++} key={index} />
            ))}
          </ul>
        </section>
      ))}
      <ShowMoreSkeleton />
    </div>
  );
}

export function ActivitySkeleton(): JSX.Element {
  return (
    <>
      <CalendarSkeleton />
      <ChipsSkeleton labels={ACTIVITY_CHIPS} />
      <TimelineSkeleton />
    </>
  );
}

function ShowMoreSkeleton(): JSX.Element {
  return (
    <span
      className={cn(
        SKELETON.block,
        "center h-control-sm self-center rounded-full px-fib-4 type-control font-medium text-transparent select-none",
      )}
    >
      Show more
    </span>
  );
}

const DIARY_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DIARY_DAYS = [2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 2];
const DIARY_LEDGER =
  "grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-fib-3";

function DiaryEntrySkeleton({
  first,
  index,
}: {
  first: boolean;
  index: number;
}): JSX.Element {
  return (
    <li
      className={cn(
        DIARY_LEDGER,
        "py-fib-2",
        first && "border-t border-rule first:border-t-0",
      )}
    >
      {first ? (
        <span className="flex flex-col items-center">
          <SkeletonText
            className="font-zuume type-heading leading-none font-bold tabular-nums"
            text="12"
          />
          <SkeletonText
            className="type-micro tracking-label uppercase"
            text="Sat"
          />
        </span>
      ) : (
        <span />
      )}
      <div className="w-10">
        <PosterTileSkeleton radius={RADIUS.mark} />
      </div>
      <div className="flex min-w-0 items-baseline gap-fib-2">
        <SkeletonLines
          className="min-w-0 flex-1 type-body"
          widths={[EVENT_WIDTHS[index % EVENT_WIDTHS.length]!]}
        />
        <SkeletonText className="shrink-0 type-meta tabular-nums" text="2000" />
      </div>
      <div className="flex items-center gap-fib-1">
        <StarsSkeleton size={11} />
      </div>
    </li>
  );
}

export function DiarySkeleton(): JSX.Element {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const today = now.getUTCDate();
  let index = 0;
  return (
    <section aria-hidden="true" className="flex flex-col gap-fib-5">
      <header className="flex flex-col gap-fib-2">
        <div className="flex items-center justify-between gap-fib-3">
          <SkeletonText
            as="h2"
            className="flex items-baseline gap-fib-2 font-zuume type-display-xs leading-none font-bold uppercase sm:type-display-sm"
            text="November 2026"
          />
          <div className="flex gap-fib-1">
            <span className="center size-control-sm">
              <SkeletonBlock className="size-4 rounded-full" />
            </span>
            <span className="center size-control-sm">
              <SkeletonBlock className="size-4 rounded-full" />
            </span>
          </div>
        </div>
        <SkeletonText
          as="p"
          className="type-meta tabular-nums"
          text="15 films · 9 days · ★ 3.5 average"
        />
      </header>
      <div className="grid items-start gap-fib-5 sm:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-fib-6">
        <div className="flex flex-col gap-fib-2">
          <div className="grid grid-cols-7 gap-1 type-micro">
            {DIARY_WEEKDAYS.map((weekday, at) => (
              <span className="text-center" key={at}>
                <SkeletonText text={weekday} />
              </span>
            ))}
          </div>
          <ol className="grid grid-cols-7 gap-1">
            {range(lead).map((at) => (
              <li key={`lead-${at}`} />
            ))}
            {range(length).map((day) => (
              <li
                className={cn(
                  "aspect-[2/3] rounded-mark",
                  day < today && SKELETON.soft,
                )}
                key={day}
              />
            ))}
          </ol>
        </div>
        <ol className="flex min-w-0 flex-col">
          {DIARY_DAYS.flatMap((count, day) =>
            range(count).map((at) => (
              <DiaryEntrySkeleton
                first={at === 0}
                index={index++}
                key={`${day}-${at}`}
              />
            )),
          )}
        </ol>
      </div>
    </section>
  );
}

function ToolbarSkeleton({ fields }: { fields: number }): JSX.Element {
  const single = fields === 1;
  return (
    <div className="flex flex-wrap items-center gap-fib-3">
      <SkeletonBlock
        className={cn(
          "h-control-md min-w-0 rounded-card",
          single ? "flex-1" : "basis-full md:basis-0 md:flex-1",
        )}
      />
      {range(fields).map((field) => (
        <SkeletonBlock
          className={cn(
            "h-control-md rounded-card",
            single
              ? "w-44 shrink-0 sm:w-56"
              : "min-w-0 flex-1 md:w-44 md:flex-none",
          )}
          key={field}
        />
      ))}
    </div>
  );
}

export function LibrarySkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="flex flex-col gap-fib-5">
      <ToolbarSkeleton fields={3} />
      <div className="flex flex-col gap-fib-5">
        <ul className="grid grid-cols-3 gap-fib-3 sm:grid-cols-4 lg:grid-cols-5">
          {range(LIBRARY_PAGE_SIZE).map((index) => (
            <li className="min-w-0" key={index}>
              <PosterTileSkeleton />
            </li>
          ))}
        </ul>
        <ShowMoreSkeleton />
      </div>
    </section>
  );
}

const REVIEW_CHIPS = ["All", "Reviews", "Ratings"];
const PROFILE_REVIEW_LINES = [
  ["100%", "100%", "100%", "100%", "40%"],
  [],
  [],
  ["100%", "100%", "100%", "100%", "56%"],
  [],
  ["78%"],
  [],
  [],
  ["100%", "100%", "100%", "100%", "100%", "28%"],
  [],
] as const;

export function ProfileReviewsSkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="flex flex-col gap-fib-5">
      <header className="flex flex-wrap items-end justify-between gap-fib-4">
        <SkeletonText
          as="p"
          className="type-meta tabular-nums"
          text="10 reviews · 100 ratings · ★ 3.5 average"
        />
        <div className="flex items-end gap-fib-2">
          <SkeletonBlock className="size-2.5 rounded-full" />
          <div className="flex h-fib-6 items-end gap-0.5">
            {range(10).map((step) => (
              <SkeletonBlock
                className="w-fib-2 rounded-t-mark"
                key={step}
                style={{ height: `${12 + ((step * 41) % 80)}%` }}
              />
            ))}
          </div>
          <StarsSkeleton size={10} />
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-fib-3">
        <ChipsSkeleton labels={REVIEW_CHIPS} />
        <SkeletonBlock className="h-control-sm w-40 rounded-full" />
      </div>
      <div className="flex flex-col gap-fib-5">
        <ul className="flex flex-col">
          {range(REVIEWS_PAGE_SIZE).map((index) => (
            <ProfileReviewSkeleton
              key={index}
              lines={PROFILE_REVIEW_LINES[index % PROFILE_REVIEW_LINES.length]!}
            />
          ))}
        </ul>
        <ShowMoreSkeleton />
      </div>
    </section>
  );
}

export function ProfileListsSkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="flex flex-col gap-fib-5">
      <ToolbarSkeleton fields={1} />
      <div className="flex flex-col gap-fib-5">
        <ListsGridSkeleton count={3} />
      </div>
    </section>
  );
}

const LIST_ENTRIES = 12;

export function ListDetailSkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="flex flex-col gap-fib-6">
      <header className="flex flex-col gap-fib-4">
        <span className="inline-flex w-fit items-center gap-fib-1 type-meta font-medium">
          <SkeletonBlock className="size-[13px] rounded-full" />
          <SkeletonText text="All lists" />
        </span>
        <div className="flex min-w-0 flex-col gap-fib-3">
          <SkeletonText
            as="h2"
            className="type-heading font-semibold"
            text="A list of films"
          />
        </div>
      </header>
      <div className="flex flex-col gap-fib-5">
        <ToolbarSkeleton fields={3} />
        <div className="flex flex-col gap-fib-5">
          <ol className="grid grid-cols-3 gap-fib-3 sm:grid-cols-4 lg:grid-cols-5">
            {range(LIST_ENTRIES).map((index) => (
              <li className="flex min-w-0 flex-col gap-fib-2" key={index}>
                <PosterTileSkeleton />
              </li>
            ))}
          </ol>
        </div>
      </div>
      <section className="flex flex-col gap-fib-4">
        <SkeletonText
          as="h3"
          className="type-base font-semibold"
          text="Comments 0"
        />
        <SkeletonText
          as="p"
          className="py-fib-5 text-center type-body"
          text="No comments yet"
        />
      </section>
    </section>
  );
}
