import type { JSX } from "react";
import { SIDEBAR_FACTS_CLASS } from "@/features/detail/constants";
import { BackdropHeroSkeleton } from "@/design/components/backdrop";
import {
  CarouselSkeleton,
  SectionHeaderSkeleton,
  SKELETON,
  SkeletonBlock,
  SkeletonLines,
  TabsSkeleton,
} from "@/design/components/skeleton";
import { cn } from "@/design/ui";
import {
  ASIDE_CLASS,
  CAROUSEL_ITEM,
  CAROUSEL_WIDE_ITEM,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  FACT_ROW_TYPE,
  HEADER_CLASS,
  HEADLINE_BOX,
  HEADLINE_TYPE,
  MAIN_COLUMN_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_BOX,
  PROSE_TYPE,
  RULE_GAP,
  SIDEBAR_CLASS,
} from "@/design/foundations/layout";
import {
  AFTER_TAGLINE,
  SKELETON_FACT_WIDTHS,
  SKELETON_REVIEW_LINES,
  TAGLINE_TYPE,
} from "./constants";

function Sidebar(): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="w-full shrink-0">
          <div className="@container">
            <SkeletonBlock className="h-[round(150cqw,1px)] w-full rounded-sheet" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }, (_, index) => (
            <SkeletonBlock className="h-12 rounded-full" key={index} />
          ))}
          <div className="col-span-2 flex gap-3">
            {Array.from({ length: 2 }, (_, index) => (
              <SkeletonBlock className="h-11 flex-1 rounded-full" key={index} />
            ))}
          </div>
        </div>
      </div>

      <div className={SIDEBAR_FACTS_CLASS}>
        <div className="flex flex-col sm:max-lg:flex-1">
          {SKELETON_FACT_WIDTHS.map(([label, value], index) => (
            <div
              className="group/row relative flex py-3 first:pt-0 last:pb-0 sm:max-lg:grow-2 sm:max-lg:items-center sm:max-lg:first:grow sm:max-lg:first:items-start sm:max-lg:last:grow sm:max-lg:last:items-end"
              key={index}
            >
              <div
                className={`${FACT_ROW_TYPE} flex h-[1lh] w-full items-center justify-between gap-6`}
              >
                <SkeletonBlock
                  className="h-[7px] rounded-full"
                  style={{ width: label }}
                />
                <SkeletonBlock
                  className="h-2.5 rounded-full"
                  style={{ width: value }}
                />
              </div>
              <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px group-last/row:hidden" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonCardSkeleton({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <div
      className={cn(
        SKELETON.block,
        "flex h-10 min-w-0 items-center gap-3 rounded-panel p-1 pr-2",
      )}
    >
      <SkeletonBlock className="size-8 shrink-0 rounded-full" />
      <SkeletonLines className="type-meta" widths={["4.5rem"]} />
    </div>
  ) : (
    <div
      className={cn(
        SKELETON.block,
        "flex h-[84px] items-center gap-3 rounded-panel p-1 pr-4",
      )}
    >
      <SkeletonBlock className="h-[76px] w-14 shrink-0 rounded-card" />
      <div className="flex min-w-0 flex-col">
        <SkeletonLines className="type-body" widths={["7.5rem"]} />
        <SkeletonLines className="type-label" widths={["5rem"]} />
      </div>
    </div>
  );
}

function People(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={<TabsSkeleton chosen="54px" width="117px" />}
        title="5.75rem"
      />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonBlock className="aspect-[3/4] rounded-sheet" key={index} />
          ))}
        </div>
        <div className="grid h-10 grid-cols-[repeat(2,minmax(0,1fr))_2.5rem] gap-3 sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))] sm:[--cells:4]">
          {Array.from({ length: 3 }, (_, index) => (
            <div className={index > 1 ? "hidden sm:block" : ""} key={index}>
              <PersonCardSkeleton compact />
            </div>
          ))}
          <SkeletonBlock className="h-10 w-full rounded-full" />
        </div>
      </div>
    </section>
  );
}

function Stills({
  chosen,
  title,
  tabs,
  wall = false,
}: {
  chosen: string;
  tabs: string;
  title: string;
  wall?: boolean;
}): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={
          <div className="flex items-center gap-2">
            <TabsSkeleton chosen={chosen} width={tabs} />
            {wall ? (
              <SkeletonBlock className="size-8 shrink-0 rounded-full" />
            ) : null}
          </div>
        }
        title={title}
      />
      <CarouselSkeleton
        aspect="aspect-video"
        blockClassName="rounded-card"
        count={3}
        itemClassName={CAROUSEL_WIDE_ITEM}
      />
    </section>
  );
}

function Reviews(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={
          <div className="flex h-4 items-center">
            <SkeletonBlock className="h-2 w-40 rounded-full" />
          </div>
        }
        title="9rem"
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-8 w-44 rounded-full" />
        <SkeletonBlock className="h-8 w-44 rounded-full" />
      </div>
      <div className="flex flex-col">
        {SKELETON_REVIEW_LINES.map((lines, index) => (
          <div className="relative flex py-6 first:pt-0 last:pb-0" key={index}>
            <div className="flex w-full flex-col gap-3">
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
            </div>
            {index < SKELETON_REVIEW_LINES.length - 1 ? (
              <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function MovieSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      className={`overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic
    >
      <div className={CONTAINER_CLASS}>
        <div className="relative">
          <BackdropHeroSkeleton />
        </div>

        <div className={pageBodyClass(true)}>
          <div className={COLUMNS_CLASS}>
            <header className={HEADER_CLASS}>
              <div className={`${HEADLINE_BOX} ${HEADLINE_TYPE}`}>
                <div className="h-[1lh] pt-[0.14em]">
                  <SkeletonBlock className="h-[0.7em] w-[58%] rounded-card" />
                </div>
              </div>
              <SkeletonBlock className={`${RULE_GAP} h-px w-full`} />
              <SkeletonLines className={TAGLINE_TYPE} widths={["13rem"]} />
              <SkeletonLines
                className={`${AFTER_TAGLINE} ${PROSE_BOX} ${PROSE_TYPE}`}
                widths={["100%", "100%", "97%", "64%"]}
              />
            </header>

            <aside className={ASIDE_CLASS}>
              <Sidebar />
            </aside>

            <div className={MAIN_COLUMN_CLASS}>
              <People />
              <Stills chosen="106px" tabs="204px" title="3.5rem" wall />
              <Stills chosen="92px" tabs="280px" title="3rem" />
              <section className="flex w-full flex-col">
                <SectionHeaderSkeleton title="6.5rem" />
                <CarouselSkeleton
                  aspect="aspect-[2/3]"
                  blockClassName="rounded-card"
                  count={5}
                  itemClassName={CAROUSEL_ITEM}
                />
              </section>
            </div>
          </div>

          <Reviews />
        </div>
      </div>
    </main>
  );
}
