"use client";

import type { JSX, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BackdropHeroSkeleton } from "@/design/components/backdrop";
import {
  SKELETON,
  SkeletonBlock,
  SkeletonLines,
  skeletonTextWidth,
} from "@/design/components/skeleton";
import { cn } from "@/design/ui";
import { useAccount } from "@/features/account/provider";
import {
  CALENDAR_CELL,
  DIARY_CALENDAR_GRID,
  DIARY_DAY_COLUMNS,
  DIARY_LAYOUT,
  PROFILE_CONTAINER_CLASS,
  PROFILE_GRID,
  PROFILE_ROW,
} from "./profile";

type AccountSkeletonSection =
  "activity" | "diary" | "list" | "lists" | "media" | "overview" | "reviews";

type Lines = readonly string[];

interface Copy {
  phone?: Lines;
  widths: Lines;
}

const SKELETON_TABS = [
  { key: null, width: 71 },
  { key: "activity", width: 78 },
  { key: "watched", width: 65 },
  { key: "diary", width: 64 },
  { key: "reviews", width: 83 },
  { key: "watchlist", width: 89 },
  { key: "lists", width: 61 },
  { key: "likes", width: 64 },
] as const;

const SKELETON_STATS = ["2.25rem", "3.8rem", "2.1rem", "4.3rem", "4.475rem"];

const SOLID_TINT = "color-mix(in srgb, var(--ink) 7%, var(--page))";

const SKELETON_RECENT_REVIEWS: Copy[] = [
  { phone: ["100%", "100%", "40%"], widths: ["100%", "62%"] },
  { phone: ["100%", "52%"], widths: ["84%"] },
  { phone: ["100%", "60%"], widths: ["91%"] },
];

const SKELETON_POPULAR_REVIEWS: Copy[] = [
  { phone: ["100%", "100%", "100%", "30%"], widths: ["100%", "48%"] },
  { phone: ["100%", "100%", "100%", "55%"], widths: ["100%", "76%"] },
  { phone: ["100%", "100%", "45%"], widths: ["100%", "35%"] },
];

const SKELETON_PAGE_REVIEWS: Copy[] = Array.from(
  { length: 20 },
  (_, index): Copy =>
    [
      { widths: [] },
      { phone: ["100%", "38%"], widths: ["84%"] },
      { widths: [] },
      { widths: [] },
      { widths: [] },
      { phone: ["100%", "20%"], widths: ["62%"] },
      { widths: [] },
      { phone: ["100%", "100%", "64%"], widths: ["100%", "46%"] },
    ][index % 8]!,
);

const SKELETON_DIARY_TITLES = [
  "8rem",
  "11rem",
  "6.5rem",
  "9.5rem",
  "12rem",
  "7rem",
  "10rem",
  "8.5rem",
  "13rem",
  "6rem",
];

const SKELETON_SPREAD = [6, 10, 18, 26, 44, 62, 88, 70, 38, 24];

const SKELETON_WEEKS = 26;

const SKELETON_FEED: Copy[] = [
  { phone: ["92%"], widths: ["100%", "48%"] },
  { phone: ["100%", "30%"], widths: ["100%", "62%"] },
  { widths: ["86%"] },
  { phone: ["88%"], widths: ["100%", "40%"] },
  { widths: ["74%"] },
];

const SKELETON_ACTIVITY_PAGE = 30;

const SKELETON_LEDGER = [
  { day: true, title: "9rem" },
  { day: false, title: "12rem" },
  { day: true, title: "7rem" },
  { day: true, title: "10.5rem" },
  { day: false, title: "8rem" },
  { day: true, title: "11rem" },
  { day: true, title: "6.5rem" },
  { day: false, title: "9.5rem" },
  { day: true, title: "13rem" },
  { day: true, title: "8.5rem" },
];

const SKELETON_LIST_ROWS = [
  { description: ["64%"], title: "13rem" },
  { description: ["92%"], title: "9rem" },
  { description: [], title: "15rem" },
  { description: ["48%"], title: "11rem" },
  { description: ["72%"], title: "8rem" },
] as const;

const SKELETON_COMMENTS = [["78%"], ["54%"]] as const;

const SKELETON_MEDIA_SECTIONS = new Set(["likes", "watched", "watchlist"]);

function Bar({
  className,
  width,
}: {
  className?: string;
  width: string;
}): JSX.Element {
  return (
    <SkeletonBlock
      className={cn("h-[7px] rounded-full", className)}
      style={{ width }}
    />
  );
}

function Tabs({ active }: { active: string | null }): JSX.Element {
  return (
    <div className="absolute inset-x-0 top-0 z-20">
      <div className="flex w-full overflow-hidden px-4 pt-4 pb-6 sm:px-6 sm:pt-5">
        <div
          className={cn(
            SKELETON.block,
            "mx-auto flex h-10 w-max shrink-0 gap-0.5 rounded-full p-1",
          )}
        >
          {SKELETON_TABS.map((tab) => (
            <div
              className={cn(
                "center h-8 rounded-full",
                tab.key === active && SKELETON.block,
              )}
              key={tab.key ?? "profile"}
              style={{ width: tab.width }}
            >
              <Bar width={`${tab.width - 32}px`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero({ backdrop }: { backdrop: boolean }): JSX.Element {
  return (
    <div className={PROFILE_CONTAINER_CLASS}>
      {backdrop ? (
        <div className="relative">
          <BackdropHeroSkeleton className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]" />
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-10 w-full",
          backdrop
            ? "-mt-20 pb-fib-4 sm:-mt-28 sm:pb-fib-5 lg:-mt-36"
            : "pt-24 pb-fib-4 sm:pt-28 sm:pb-fib-5 lg:pt-32",
        )}
      >
        <div className="plan relative z-10 gap-y-fib-4 lg:items-end">
          <div className="plan-main flex min-w-0 items-center gap-fib-4 sm:gap-fib-5">
            <SkeletonBlock className="size-fib-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="font-zuume flex h-[1lh] items-center type-display-xs leading-none sm:type-display-sm lg:type-display-md">
                <SkeletonBlock className="h-[0.72em] w-[3.75em] max-w-full rounded-card" />
              </div>
              <div className="mt-1.5 flex h-[1lh] items-center gap-x-2.5 type-control sm:type-body">
                <Bar className="h-2" width="5.25rem" />
                <SkeletonBlock className="size-1 rounded-full" />
                <Bar className="h-2" width="7.25rem" />
              </div>
            </div>
          </div>

          <ul className="plan-aside grid min-w-0 auto-cols-fr grid-flow-col divide-x divide-rule">
            {SKELETON_STATS.map((label) => (
              <li className="flex justify-center" key={label}>
                <div className="flex w-full flex-col items-center gap-1 px-1">
                  <div className="flex h-7 items-center sm:h-8">
                    <SkeletonBlock className="h-4 w-8 rounded-thumb sm:h-5" />
                  </div>
                  <div className="flex h-3 items-center">
                    <Bar className="h-1.5" width={label} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({
  after,
  children,
  title,
}: {
  after?: string;
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <section className="flex w-full min-w-0 flex-col">
      <div className="relative mb-fib-3 flex min-h-fib-5 items-end justify-between gap-fib-4 pb-fib-2">
        <div className="flex h-4 items-center">
          <Bar width={skeletonTextWidth(title)} />
        </div>
        {after ? (
          <div className="flex h-4 items-center">
            <Bar width={after} />
          </div>
        ) : null}
        <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px" />
      </div>
      {children}
    </section>
  );
}

function Posters({
  className,
  count,
}: {
  className?: string;
  count: number;
}): JSX.Element {
  return (
    <ul className={cn(PROFILE_GRID, className)}>
      {Array.from({ length: count }, (_, index) => (
        <li className="min-w-0" key={index}>
          <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
        </li>
      ))}
    </ul>
  );
}

function PosterStackSkeleton(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex w-full">
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonBlock
          className="aspect-[2/3] w-[28%] shrink-0 rounded-thumb ring-1 ring-edge-hover ring-inset not-first:-ml-[10%]"
          key={index}
          style={{ backgroundColor: SOLID_TINT, zIndex: 5 - index }}
        />
      ))}
    </div>
  );
}

function Reviews({ bodies }: { bodies: readonly Copy[] }): JSX.Element {
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {bodies.map((body, index) => (
        <li
          className="flex gap-fib-3 py-fib-4 first:pt-0 last:pb-0"
          key={index}
        >
          <SkeletonBlock className="aspect-[2/3] w-14 shrink-0 self-start rounded-tile sm:w-[4.5rem]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-6 items-center gap-2 sm:h-7">
              <SkeletonBlock className="h-2.5 w-40 max-w-[70%] rounded-full sm:h-3" />
              <Bar className="h-2" width="2.25rem" />
            </div>
            <div className="mt-1 flex h-4 items-center gap-3">
              <SkeletonBlock className="h-3 w-[4.5rem] rounded-full" />
              <Bar width="4.5rem" />
            </div>
            {body.widths.length > 0 ? (
              <SkeletonLines
                className="mt-3 type-body leading-6"
                phone={body.phone}
                widths={body.widths}
              />
            ) : null}
            <div className="mt-2 -ml-2 flex h-8 items-center gap-1.5 px-2">
              <SkeletonBlock className="size-3.5 rounded-full" />
              <Bar width="0.5rem" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DiaryDigest(): JSX.Element {
  return (
    <div className="flex gap-fib-3">
      <SkeletonBlock className="h-9 w-fib-5 shrink-0 rounded-thumb" />
      <ol className="flex min-w-0 flex-1 flex-col gap-1">
        {SKELETON_DIARY_TITLES.map((width, index) => (
          <li className="flex h-5 min-w-0 items-center gap-2.5" key={index}>
            <span className="flex w-5 shrink-0 justify-end">
              <Bar width="0.75rem" />
            </span>
            <Bar className="h-2 max-w-full" width={width} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Ratings(): JSX.Element {
  return (
    <div className="flex flex-col gap-fib-4">
      <div className="flex h-[49px] items-start gap-fib-3">
        <SkeletonBlock className="h-9 w-[3.25rem] rounded-thumb" />
        <div className="mt-[19px] flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-[4.5rem] rounded-full" />
          <div className="flex h-3 items-center">
            <Bar className="h-1.5" width="4.5rem" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="relative flex h-fib-7 items-end gap-fib-1">
          {SKELETON_SPREAD.map((height, index) => (
            <SkeletonBlock
              className="flex-1 rounded-t-mark"
              key={index}
              style={{ height: `${height}%` }}
            />
          ))}
          <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px" />
        </div>
        <div className="flex h-[9px] justify-between">
          <SkeletonBlock className="size-[9px] rounded-full" />
          <SkeletonBlock className="h-[9px] w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function Calendar(): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="grid shrink-0 grid-rows-[12px_repeat(7,10px)] gap-[3px]">
          {Array.from({ length: 8 }, (_, row) => (
            <span className="flex items-center" key={row}>
              {row % 2 === 0 && row > 0 ? (
                <Bar className="h-1.5" width="1.125rem" />
              ) : null}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse justify-start gap-[3px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_28px)]">
          {Array.from({ length: SKELETON_WEEKS }, (_, week) => (
            <div className="flex shrink-0 flex-col gap-[3px]" key={week}>
              <span className="relative h-3">
                {week % 4 === 2 ? (
                  <Bar
                    className="absolute top-[3px] left-0 h-1.5"
                    width="1rem"
                  />
                ) : null}
              </span>
              {Array.from({ length: 7 }, (_, day) => (
                <SkeletonBlock className={CALENDAR_CELL} key={day} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-4 items-center justify-between gap-3">
        <Bar width="6.5rem" />
        <span className="flex items-center gap-[3px]">
          <Bar className="mr-1" width="1.25rem" />
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock className={CALENDAR_CELL} key={index} />
          ))}
          <Bar className="ml-1" width="1.5rem" />
        </span>
      </div>
    </div>
  );
}

function Feed(): JSX.Element {
  return (
    <ol className="flex flex-col">
      {SKELETON_FEED.map((copy, index) => (
        <li
          className="relative border-l border-rule pb-4 pl-4 last:border-transparent last:pb-0"
          key={index}
        >
          <SkeletonBlock className="absolute top-1.5 -left-[3.5px] size-1.5 rounded-full" />
          <SkeletonLines
            className="type-control leading-5"
            phone={copy.phone}
            widths={copy.widths}
          />
        </li>
      ))}
    </ol>
  );
}

function Overview(): JSX.Element {
  return (
    <div className="plan w-full gap-y-fib-6">
      <div className="plan-main flex min-w-0 flex-col gap-fib-6">
        <Section title="Favorite films">
          <Posters className={PROFILE_ROW} count={5} />
        </Section>
        <Section after="1.25rem" title="Recently watched">
          <Posters className={PROFILE_ROW} count={5} />
        </Section>
        <Section after="1.25rem" title="Watchlist">
          <Posters className={PROFILE_ROW} count={5} />
        </Section>
        <Section after="2rem" title="Recent reviews">
          <Reviews bodies={SKELETON_RECENT_REVIEWS} />
        </Section>
        <Section after="1.75rem" title="Popular reviews">
          <Reviews bodies={SKELETON_POPULAR_REVIEWS} />
        </Section>
        <Section after="2rem" title="Lists">
          <div className="grid gap-x-fib-4 gap-y-fib-5 sm:grid-cols-3">
            {["7.5rem", "6rem", "8.5rem"].map((width) => (
              <div className="flex flex-col gap-2.5" key={width}>
                <PosterStackSkeleton />
                <div className="flex h-5 items-center gap-2">
                  <Bar className="h-2.5" width={width} />
                  <Bar width="2.75rem" />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <aside className="plan-aside grid min-w-0 content-start gap-fib-6 sm:grid-cols-2 sm:gap-x-fib-5 lg:grid-cols-1">
        <Section title="Bio">
          <SkeletonLines className="type-control leading-5" widths={["86%"]} />
        </Section>
        <Section after="1.25rem" title="Diary">
          <DiaryDigest />
        </Section>
        <Section after="1.25rem" title="Ratings">
          <Ratings />
        </Section>
        <Section after="1.5rem" title="Activity">
          <div className="flex flex-col gap-fib-4">
            <Calendar />
            <Feed />
          </div>
        </Section>
        <Section after="1rem" title="Following">
          <ul className="grid grid-cols-6 gap-fib-2">
            {Array.from({ length: 12 }, (_, index) => (
              <li key={index}>
                <SkeletonBlock className="aspect-square w-full rounded-full" />
              </li>
            ))}
          </ul>
        </Section>
      </aside>
    </div>
  );
}

function Filters({
  fields,
  search = true,
}: {
  fields: number;
  search?: boolean;
}): JSX.Element {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
      {search ? (
        <SkeletonBlock className="col-span-full h-10 min-w-0 rounded-full md:flex-1" />
      ) : null}
      {Array.from({ length: fields }, (_, index) => (
        <div
          className={cn(
            SKELETON.block,
            "flex h-10 min-w-0 items-center justify-between rounded-full px-3.5 md:w-44 md:flex-none lg:w-48",
            search && "md:w-auto md:flex-1 lg:w-48 lg:flex-none",
            fields % 2 === 1 && index === fields - 1 && "col-span-full",
          )}
          key={index}
        >
          <Bar className="h-2" width="4.5rem" />
          <SkeletonBlock className="size-2.5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Pages(): JSX.Element {
  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      {[0, 1, null, 2, 3].map((step, index) =>
        step === null ? (
          <Bar className="mx-1 h-1" key={index} width="0.75rem" />
        ) : (
          <SkeletonBlock className="size-9 rounded-full" key={index} />
        ),
      )}
    </div>
  );
}

function Activity(): JSX.Element {
  return (
    <div className="flex w-full flex-col">
      <Filters fields={2} search={false} />
      <ul className="divide-y divide-rule">
        {Array.from({ length: SKELETON_ACTIVITY_PAGE }, (_, index) => (
          <li className="flex items-center gap-3 py-3.5 sm:gap-4" key={index}>
            <SkeletonBlock className="h-[3.25rem] w-9 shrink-0 rounded-thumb" />
            <SkeletonLines
              className="min-w-0 flex-1 type-body leading-6"
              widths={[`${40 + ((index * 37) % 35)}%`]}
            />
            <SkeletonLines className="shrink-0 type-meta" widths={["2.5rem"]} />
          </li>
        ))}
      </ul>
      <Pages />
    </div>
  );
}

function Diary(): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-fib-5">
      <div className="flex flex-col gap-fib-4 border-b border-rule pb-fib-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <Bar className="h-1.5" width="4.5rem" />
          <SkeletonBlock className="h-14 w-56 rounded-mark sm:h-[4.5rem] sm:w-72" />
        </div>
        <div className="flex gap-fib-5">
          {["2rem", "1.75rem", "2.5rem"].map((width) => (
            <div className="flex flex-col gap-2" key={width}>
              <SkeletonBlock className="h-6 rounded-mark" style={{ width }} />
              <Bar className="h-1.5" width="2.5rem" />
            </div>
          ))}
        </div>
      </div>
      <div className={DIARY_LAYOUT}>
        <div className={DIARY_CALENDAR_GRID}>
          {Array.from({ length: 35 }, (_, index) => (
            <SkeletonBlock
              className={cn(
                "aspect-[2/3] rounded-thumb",
                index % 3 !== 0 && "opacity-40",
              )}
              key={index}
            />
          ))}
        </div>
        <ul className="flex min-w-0 flex-col">
          {SKELETON_LEDGER.filter((row) => row.day).map((row, index) => (
            <li className={`${DIARY_DAY_COLUMNS} py-fib-3`} key={index}>
              <div className="flex flex-col gap-2 pt-2.5">
                <SkeletonBlock className="h-7 w-8 rounded-mark sm:h-10 sm:w-10" />
                <Bar className="h-1.5" width="1.5rem" />
              </div>
              <div className="flex min-w-0 items-center gap-fib-3 py-2.5 sm:gap-fib-4">
                <SkeletonBlock className="h-[4.5rem] w-12 shrink-0 rounded-thumb sm:h-[5.25rem] sm:w-14" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex h-5 items-center">
                    <Bar className="h-2 max-w-full" width={row.title} />
                  </div>
                  <SkeletonBlock className="h-3 w-[4.5rem] rounded-full" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Lists(): JSX.Element {
  return (
    <div className="flex w-full flex-col">
      <Filters fields={1} search={false} />
      <ul className="flex flex-col divide-y divide-rule">
        {SKELETON_LIST_ROWS.map((list, index) => (
          <li
            className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
            key={index}
          >
            <div className="w-full shrink-0 sm:w-60">
              <PosterStackSkeleton />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex h-6 items-center">
                <SkeletonBlock
                  className="h-2.5 max-w-full rounded-full"
                  style={{ width: list.title }}
                />
              </div>
              <div className="flex h-4 items-center gap-3">
                <Bar width="4.5rem" />
                <Bar width="6rem" />
                <Bar width="1.75rem" />
                <Bar width="1.75rem" />
              </div>
              {list.description.length > 0 ? (
                <SkeletonLines
                  className="mt-1 max-w-2xl type-body leading-6"
                  widths={list.description}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function List(): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex flex-col gap-5">
        <div className="flex h-[1lh] items-center gap-1.5 type-label">
          <SkeletonBlock className="size-[13px] rounded-full" />
          <Bar width="4.25rem" />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex h-8 items-center">
            <SkeletonBlock className="h-4 w-48 max-w-full rounded-full" />
          </div>
          <div className="flex h-5 items-center gap-x-2">
            <Bar className="h-2" width="6.25rem" />
            <Bar className="h-2" width="3.75rem" />
            <Bar className="h-2" width="9.5rem" />
          </div>
          <SkeletonLines
            className="max-w-2xl type-body leading-6"
            widths={["58%"]}
          />
        </div>
      </div>
      <div className="flex w-full flex-col">
        <Filters fields={3} />
        <Posters count={18} />
      </div>
      <Section after="5.5rem" title="Comments">
        <ul className="flex flex-col divide-y divide-rule">
          {SKELETON_COMMENTS.map((lines, index) => (
            <li
              className="flex flex-col gap-3 py-6 first:pt-0 last:pb-0"
              key={index}
            >
              <div className="flex items-center gap-3.5">
                <SkeletonBlock className="size-11 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-col gap-1">
                  <SkeletonLines
                    className="type-base leading-6"
                    widths={["7rem"]}
                  />
                  <SkeletonLines className="type-meta" widths={["5rem"]} />
                </div>
              </div>
              <SkeletonLines className="type-copy leading-7" widths={lines} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Media(): JSX.Element {
  return (
    <div className="flex w-full flex-col">
      <Filters fields={3} />
      <Posters count={36} />
      <Pages />
    </div>
  );
}

function ReviewsPage(): JSX.Element {
  return (
    <div className="flex w-full flex-col">
      <Filters fields={2} />
      <Reviews bodies={SKELETON_PAGE_REVIEWS} />
      <Pages />
    </div>
  );
}

const BODIES: Record<AccountSkeletonSection, () => JSX.Element> = {
  activity: Activity,
  diary: Diary,
  list: List,
  lists: Lists,
  media: Media,
  overview: Overview,
  reviews: ReviewsPage,
};

export function AccountSectionSkeleton({
  section,
}: {
  section: AccountSkeletonSection;
}): JSX.Element {
  const Body = BODIES[section];
  return (
    <div aria-busy="true" className="w-full">
      <Body />
    </div>
  );
}

function placeOf(pathname: string) {
  const [, username = null, tab = null, slug = null] = pathname
    .split("/")
    .filter(Boolean);
  const section: AccountSkeletonSection =
    tab === null
      ? "overview"
      : SKELETON_MEDIA_SECTIONS.has(tab)
        ? "media"
        : tab === "lists" && slug
          ? "list"
          : (tab as AccountSkeletonSection);
  return {
    section: section in BODIES ? section : "overview",
    tab,
    username: username && decodeURIComponent(username),
  };
}

export function AccountSkeleton(): JSX.Element {
  const { account } = useAccount();
  const { section, tab, username } = placeOf(usePathname());
  const own = account && (!username || account.username === username);
  const backdrop = own ? Boolean(account.backgroundUrl?.trim()) : true;

  return (
    <main
      aria-busy="true"
      className="ui-scene min-h-screen overflow-x-clip pb-[calc(var(--dock-h,6rem)+3rem)]"
      data-cinematic
    >
      <div className="relative z-10 w-full [overflow-anchor:none]">
        <Tabs active={tab} />
        <Hero backdrop={backdrop} />
        <div className={PROFILE_CONTAINER_CLASS}>
          <section className="w-full pt-fib-5 lg:pt-fib-6">
            <AccountSectionSkeleton section={section} />
          </section>
        </div>
      </div>
    </main>
  );
}
