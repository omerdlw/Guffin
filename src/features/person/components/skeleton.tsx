import type { JSX } from "react";
import {
  SegmentedSkeleton,
  SkeletonBlock,
  SkeletonButton,
  SkeletonLines,
  SkeletonText,
} from "@/design/components/skeleton";
import {
  CAROUSEL_ITEM,
  PROSE_BOX,
  PROSE_TYPE,
  RULE_GAP,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import {
  DetailFrameSkeleton,
  DetailHeadingSkeleton,
  PosterSkeleton,
  range,
  SidebarSkeleton,
  TitleSkeleton,
} from "@/features/detail-page/components/skeleton";
import {
  CAREER_SLOT_CLASS,
  FILMOGRAPHY_GRID_CLASS,
  PERSON_FILMOGRAPHY_PREVIEW,
  PERSON_LINKS_CLASS,
} from "../model";

const PERSON_FACTS = [
  ["Born", "8rem"],
  ["Age", "4rem"],
  ["Birthplace", "12rem"],
  ["Also known as", "9rem"],
  ["Known for", "10rem"],
] as const;

const MEDIUMS = ["Films", "Shows"];

const CAREER_YEARS = 40;

function Career(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton
        actions={
          <div className="flex items-center gap-4">
            <SkeletonText
              className={`hidden items-center gap-1.5 sm:flex ${TONE.label}`}
              text="In the timeline →"
            />
            <SegmentedSkeleton labels={MEDIUMS} />
          </div>
        }
        title="Career"
      />
      <div className="flex flex-col gap-5">
        <div className="flex min-h-14 items-end gap-5">
          <div className="font-zuume type-display-sm leading-crop sm:type-display-md">
            <SkeletonBlock className="h-[1lh] w-[1.35em] rounded-thumb" />
          </div>
          <div className="flex flex-col gap-1 pb-0.5">
            <SkeletonLines className="type-label" widths={["6rem"]} />
            <SkeletonLines className="type-body" widths={["12rem"]} />
          </div>
        </div>
        <div className="relative flex h-40 items-end gap-[3px] sm:h-48">
          {range(CAREER_YEARS).map((index) => (
            <div className={cn(CAREER_SLOT_CLASS, "h-full")} key={index}>
              <div className="flex h-full items-end">
                <SkeletonBlock
                  className="w-full rounded-t-mark"
                  style={{ height: `${8 + ((index * 37) % 82)}%` }}
                />
              </div>
            </div>
          ))}
          <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px" />
        </div>
        <div className="-mt-3 flex h-4 gap-[3px]">
          {range(CAREER_YEARS).map((index) => (
            <span className={CAREER_SLOT_CLASS} key={index}>
              {index % 5 === 3 ? (
                <SkeletonText
                  className={cn(
                    `absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap ${TONE.label}`,
                    (index / 5) % 2 >= 1 && "max-sm:hidden",
                  )}
                  text="2000"
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Filmography(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton
        actions={
          <div className="flex items-center gap-2">
            <SegmentedSkeleton labels={MEDIUMS} />
            <SkeletonBlock className="h-control-sm w-44 rounded-full" />
          </div>
        }
        title="Filmography · Acting (78)"
      />
      <div className="flex flex-col">
        <div className={FILMOGRAPHY_GRID_CLASS}>
          {range(PERSON_FILMOGRAPHY_PREVIEW).map((index) => (
            <div className="min-w-0" key={index}>
              <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="mt-3 h-control-md w-full rounded-full" />
      </div>
    </section>
  );
}

function Gallery(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <DetailHeadingSkeleton
        actions={
          <div className="flex items-center gap-2">
            <SegmentedSkeleton labels={["Portraits", "Backdrops"]} />
            <SkeletonButton size="sm" />
          </div>
        }
        title="Gallery"
      />
      <div className="flex gap-3 overflow-hidden">
        {range(5).map((index) => (
          <div className={cn("shrink-0", CAROUSEL_ITEM)} key={index}>
            <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PersonSkeleton(): JSX.Element {
  return (
    <DetailFrameSkeleton
      className="person-page"
      header={
        <>
          <TitleSkeleton width="48%" />
          <div className={`${RULE_GAP} flex items-center gap-4`}>
            <SkeletonText className={`shrink-0 ${TONE.label}`} text="Actor" />
            <SkeletonBlock className="h-px min-w-6 flex-1" />
            <div className={PERSON_LINKS_CLASS}>
              {range(4).map((index) => (
                <div className="center size-9" key={index}>
                  <SkeletonBlock className="size-5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3">
            <SkeletonLines
              className={`${PROSE_BOX} w-full ${PROSE_TYPE}`}
              phone={["100%", "100%", "100%", "100%", "100%", "100%", "44%"]}
              widths={["100%", "100%", "100%", "62%"]}
            />
            <div>
              <SkeletonText className={TONE.label} text="Read more" />
            </div>
          </div>
        </>
      }
      main={
        <>
          <Career />
          <Filmography />
          <Gallery />
        </>
      }
      sidebar={
        <SidebarSkeleton facts={PERSON_FACTS}>
          <PosterSkeleton />
          <div className="flex gap-3">
            {["Timeline", "Awards"].map((label) => (
              <div className="min-w-0 flex-1" key={label}>
                <SkeletonButton
                  className="w-full"
                  icon
                  label={label}
                  size="lg"
                />
              </div>
            ))}
          </div>
        </SidebarSkeleton>
      }
    />
  );
}
