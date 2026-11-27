import { type CSSProperties, Fragment, type JSX, type ReactNode } from "react";
import { BackdropHeroSkeleton } from "@/design/components/backdrop";
import {
  SegmentedSkeleton,
  SKELETON,
  SkeletonBlock,
  SkeletonButton,
  SkeletonLines,
  SkeletonText,
} from "@/design/components/skeleton";
import { DockClear } from "@/design/dock/clear";
import {
  ASIDE_CLASS,
  CAROUSEL_ITEM,
  CAROUSEL_WIDE_ITEM,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  marqueeClass,
  FACT_ROW_TYPE,
  HEADER_CLASS,
  HEADLINE_BOX,
  HEADLINE_TYPE,
  MAIN_COLUMN_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_CLASS,
  RULE_GAP,
  SIDEBAR_CLASS,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { POSTER_STACK_SLOTS } from "@/features/lists/components/poster-stack";
import {
  AFTER_TAGLINE,
  CAST_SEATS,
  TAGLINE_CLASS,
  TITLE_LIMITS,
} from "@/features/movie/model";
import { REVIEW_ROW } from "@/features/reviews/components/review-card";
import { REVIEWS_PAGE_SIZE } from "@/features/reviews/model";
import cast from "@/features/movie/components/cast.module.css";
import { SIDEBAR_FACTS_CLASS } from "../model";

export const range = (count: number) =>
  Array.from({ length: count }, (_, index) => index);

function Circle({ size }: { size: number }): JSX.Element {
  return (
    <SkeletonBlock
      className="shrink-0 rounded-full"
      style={{ height: size, width: size }}
    />
  );
}

function Letters({ text }: { text: string }): JSX.Element {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <Fragment key={index}>
          {index > 0 ? " " : null}
          <span className="inline-block whitespace-nowrap">
            {[...word].map((letter, at) => (
              <span className="inline-block" key={at}>
                {letter}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

export function DetailHeadingSkeleton({
  actions,
  progress = false,
  title,
}: {
  actions?: ReactNode;
  progress?: boolean;
  title: string;
}): JSX.Element {
  return (
    <div aria-hidden="true" className="relative z-10 mb-4">
      <div className="flex min-h-8 w-full flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <Circle size={18} />
          <SkeletonText
            as="h2"
            className={`min-w-0 ${TONE.label}`}
            text={<Letters text={title} />}
          />
        </div>
        <div className="relative h-2 min-w-6 flex-1">
          <SkeletonBlock
            className={cn(
              "absolute inset-x-0 top-1/2",
              progress ? "h-1 -translate-y-1/2 rounded-full" : "h-px",
            )}
          />
        </div>
        {actions ? (
          <div className="ml-auto max-w-full min-w-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DetailFrameSkeleton({
  after,
  backdrop = true,
  className,
  header,
  main,
  sidebar,
}: {
  after?: ReactNode;
  backdrop?: boolean;
  className: string;
  header: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
}): JSX.Element {
  return (
    <main
      aria-busy="true"
      className={`${className} overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic=""
      id="main"
    >
      <DockClear extra="2rem" />
      <span className="sr-only">Loading</span>
      <div className={CONTAINER_CLASS}>
        {backdrop ? (
          <div className="relative">
            <BackdropHeroSkeleton />
          </div>
        ) : null}
        <div className={pageBodyClass(backdrop)}>
          <div className={COLUMNS_CLASS}>
            <header className={HEADER_CLASS}>{header}</header>
            <aside className={ASIDE_CLASS}>{sidebar}</aside>
            <div className={MAIN_COLUMN_CLASS}>{main}</div>
          </div>
          {after}
        </div>
      </div>
    </main>
  );
}

export function TitleSkeleton({
  className = `${HEADLINE_BOX} ${HEADLINE_TYPE}`,
  width = "58%",
}: {
  className?: string;
  width?: string;
}): JSX.Element {
  return (
    <div aria-hidden="true" className={className}>
      <div className="flex h-[1lh] items-center">
        <SkeletonBlock className="h-[0.72em] rounded-card" style={{ width }} />
      </div>
    </div>
  );
}

export function RuleStatsSkeleton({
  stats = 3,
}: {
  stats?: number;
}): JSX.Element {
  return (
    <div className={`${RULE_GAP} relative flex w-full items-center gap-5`}>
      <SkeletonBlock className="h-px flex-1" />
      {stats > 0 ? (
        <div className="relative flex shrink-0 items-center gap-5">
          {range(stats).map((index) => (
            <span
              className="flex items-center gap-1.5 type-control leading-5"
              key={index}
            >
              <Circle size={16} />
              <SkeletonLines className="w-7" widths={["100%"]} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SynopsisSkeleton({
  overview = ["100%", "100%", "72%"],
  overviewPhone = ["100%", "100%", "100%", "100%", "100%", "64%"],
  tagline = "15rem",
  taglinePhone = ["100%", "52%"],
  tags = TAG_WIDTHS,
}: {
  overview?: readonly string[];
  overviewPhone?: readonly string[];
  tagline?: string | null;
  taglinePhone?: readonly string[];
  tags?: readonly string[];
}): JSX.Element {
  return (
    <>
      {tagline ? (
        <SkeletonLines
          className={TAGLINE_CLASS}
          phone={taglinePhone}
          widths={[tagline]}
        />
      ) : null}
      <SkeletonLines
        className={cn(PROSE_CLASS, tagline && AFTER_TAGLINE)}
        phone={overviewPhone}
        widths={overview}
      />
      {tags.length > 0 ? (
        <ul aria-hidden="true" className="mt-6 flex flex-wrap gap-2">
          {tags.map((width, index) => (
            <li key={index}>
              <SkeletonBlock
                className="h-control-xs rounded-full"
                style={{ width }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

const TAG_WIDTHS = [
  "5.5rem",
  "4.25rem",
  "6.75rem",
  "5rem",
  "7.25rem",
  "4.5rem",
  "6rem",
  "5.25rem",
];

export function PosterSkeleton(): JSX.Element {
  return (
    <div className="@container w-full shrink-0">
      <SkeletonBlock className="h-[round(150cqw,1px)] w-full rounded-sheet" />
    </div>
  );
}

export function CollectionSkeleton({
  main = ["Mark watched", "Watchlist"],
  secondary = [],
}: {
  main?: readonly [string, string];
  secondary?: readonly string[];
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      {main.map((label) => (
        <div className="min-w-0" key={label}>
          <SkeletonButton className="w-full" icon label={label} size="lg" />
        </div>
      ))}
      {secondary.length > 0 ? (
        <div className="col-span-2 flex gap-3">
          {secondary.map((label) => (
            <div className="min-w-0 flex-1" key={label}>
              <SkeletonButton className="w-full" icon label={label} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FactsSkeleton({
  facts,
}: {
  facts: readonly (readonly [label: string, value: string])[];
}): JSX.Element {
  return (
    <div className={SIDEBAR_FACTS_CLASS}>
      <div
        className="flex flex-col max-sm:data-folded:[&>:nth-child(n+5)]:hidden sm:max-lg:flex-1"
        data-folded={facts.length > 5 ? "" : undefined}
      >
        {facts.map(([label, value]) => (
          <div
            className="group/row relative flex py-3 first:pt-0 last:pb-0 sm:max-lg:grow-2 sm:max-lg:items-center sm:max-lg:first:grow sm:max-lg:first:items-start sm:max-lg:last:grow sm:max-lg:last:items-end"
            key={label}
          >
            <div className="flex w-full items-baseline justify-between gap-6">
              <SkeletonText className={`shrink-0 ${TONE.label}`} text={label} />
              <SkeletonLines
                className={`min-w-0 flex-1 text-right ${FACT_ROW_TYPE} font-medium [&>*]:justify-end`}
                widths={[value]}
              />
            </div>
            <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px group-last/row:hidden" />
          </div>
        ))}
      </div>
      {facts.length > 5 ? (
        <SkeletonText
          className={`self-start sm:hidden ${TONE.label}`}
          text={`All details · ${facts.length}`}
        />
      ) : null}
    </div>
  );
}

export function SidebarSkeleton({
  children,
  facts,
}: {
  children: ReactNode;
  facts: readonly (readonly [string, string])[];
}): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
      <FactsSkeleton facts={facts} />
    </div>
  );
}

export function PeopleSkeleton(): JSX.Element {
  return (
    <section className={cn(cast.section, "flex w-full flex-col")}>
      <DetailHeadingSkeleton
        actions={<SegmentedSkeleton labels={["Cast", "Crew"]} />}
        title="Cast & Crew"
      />
      <div className="flex flex-col gap-3">
        <div className={cast.stack}>
          {CAST_SEATS.map((seat, index) => (
            <div
              className={cast.seat}
              data-lead={index === 0 ? "" : undefined}
              key={index}
              style={{ "--grow": "2.86", order: seat.order } as CSSProperties}
            >
              <SkeletonBlock className={cn(cast.holder, "rounded-sheet")} />
            </div>
          ))}
        </div>
        <div className={cast.roll}>
          <SkeletonLines
            className="flex w-full flex-col gap-1 sm:hidden [&>*]:justify-center"
            widths={["100%", "60%"]}
          />
          <SkeletonLines
            className="w-full max-sm:hidden [&>*]:justify-center"
            widths={["24rem"]}
          />
        </div>
      </div>
    </section>
  );
}

export function StillsSkeleton({
  labels,
  title,
  wall = false,
}: {
  labels?: readonly string[];
  title: string;
  wall?: boolean;
}): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton
        actions={
          labels ? (
            <div className="flex items-center gap-2">
              <SegmentedSkeleton labels={labels} />
              {wall ? <SkeletonButton size="sm" /> : null}
            </div>
          ) : undefined
        }
        title={title}
      />
      <div className="flex gap-3 overflow-hidden">
        {range(2).map((index) => (
          <div className={cn("shrink-0", CAROUSEL_WIDE_ITEM)} key={index}>
            <SkeletonBlock className="aspect-video w-full rounded-card" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PostersSkeleton({ title }: { title: string }): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton title={title} />
      <div className="flex gap-3 overflow-hidden">
        {range(4).map((index) => (
          <div className={cn("shrink-0", CAROUSEL_ITEM)} key={index}>
            <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
          </div>
        ))}
      </div>
    </section>
  );
}

const DIGEST_LINES = [
  ["62%"],
  ["100%", "100%", "100%", "100%", "100%", "100%", "48%"],
  ["74%"],
  ["100%", "100%", "100%", "56%"],
] as const;

function ReviewCardSkeleton({
  lines,
}: {
  lines: readonly string[];
}): JSX.Element {
  return (
    <li className={REVIEW_ROW}>
      <div className="flex min-w-0 gap-fib-3 sm:gap-fib-4">
        <div className="flex w-11 shrink-0 self-start">
          <Circle size={44} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-fib-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-fib-2 gap-y-1">
            <span className="flex items-center gap-1">
              {range(5).map((index) => (
                <Circle key={index} size={14} />
              ))}
            </span>
            <SkeletonText
              className="type-base font-medium"
              text="Account name"
            />
            <SkeletonText className="type-meta tabular-nums" text="Nov 16" />
          </div>
          <SkeletonLines
            className="max-w-[65ch] type-body [&>*]:leading-6"
            widths={lines}
          />
          <div className="-mb-2 -ml-2">
            <span className="flex h-control-sm items-center gap-1.5 px-2">
              <Circle size={14} />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

export function DigestSkeleton({
  more = true,
}: {
  more?: boolean;
}): JSX.Element {
  return (
    <div className="grid w-full gap-x-10 gap-y-12 lg:grid-cols-2">
      {["Popular Reviews", "Recent Reviews"].map((title) => (
        <section className="flex w-full min-w-0 flex-col" key={title}>
          <DetailHeadingSkeleton
            actions={
              more ? (
                <SkeletonText className={TONE.label} text="More" />
              ) : undefined
            }
            title={title}
          />
          <ul className="flex flex-col">
            {DIGEST_LINES.map((lines, index) => (
              <ReviewCardSkeleton key={index} lines={lines} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function PopularListsSkeleton(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton title="Popular Lists" />
      <ul className={`flex flex-col divide-y ${TONE.rules}`}>
        {range(3).map((index) => (
          <li
            className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
            key={index}
          >
            <div className="block w-full shrink-0 sm:w-60">
              <PosterStackSkeleton />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <SkeletonLines
                className="type-title font-semibold"
                widths={["16rem"]}
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 type-control">
                <span className="flex min-w-0 items-center gap-2">
                  <Circle size={20} />
                  <SkeletonLines widths={["6rem"]} />
                </span>
                <SkeletonLines widths={["3.5rem"]} />
                <SkeletonLines widths={["2.25rem"]} />
                <SkeletonLines widths={["2.25rem"]} />
              </div>
              <SkeletonLines
                className="mt-1 max-w-2xl type-copy leading-7"
                widths={["17rem"]}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const BOARD_LINES = [
  ["62%"],
  ["100%", "100%", "100%", "48%"],
  ["74%"],
  ["100%", "56%"],
  ["40%"],
] as const;

export function ReviewsPageSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      className={`movie-page overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic=""
      id="main"
    >
      <DockClear extra="2rem" />
      <span className="sr-only">Loading</span>
      <div className={CONTAINER_CLASS}>
        <div className="relative">
          <BackdropHeroSkeleton />
        </div>
        <div
          className={`${pageBodyClass(true)} mx-auto max-w-3xl items-center`}
        >
          <header className="relative flex w-full min-w-0 flex-col items-center text-center">
            <div className="mb-6 w-28 sm:w-32 lg:w-36">
              <PosterSkeleton />
            </div>
            <TitleSkeleton
              className={`${marqueeClass("Film title", TITLE_LIMITS)} flex w-full flex-col items-center`}
              width="3.6em"
            />
          </header>
          <div className="flex w-full min-w-0 flex-col">
            <section className="flex w-full flex-col">
              <div className="mb-6 grid w-full grid-cols-2 gap-3">
                <SkeletonBlock className="h-control-md w-full rounded-full" />
                <SkeletonBlock className="h-control-md w-full rounded-full" />
              </div>
              <ul className="flex flex-col">
                {range(REVIEWS_PAGE_SIZE).map((index) => (
                  <ReviewCardSkeleton
                    key={index}
                    lines={BOARD_LINES[index % BOARD_LINES.length]!}
                  />
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export function PosterStackSkeleton(): JSX.Element {
  return (
    <div className="flex w-full rounded-thumb">
      {range(POSTER_STACK_SLOTS).map((slot) => (
        <div
          className={`${SKELETON.solid} relative aspect-[2/3] w-[28%] shrink-0 rounded-thumb not-first:-ml-[10%]`}
          key={slot}
          style={{ zIndex: POSTER_STACK_SLOTS - slot }}
        >
          <span className="absolute inset-0 rounded-[inherit] ring-1 ring-edge-hover ring-inset" />
        </div>
      ))}
    </div>
  );
}
