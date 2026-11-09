"use client";

import type { JSX } from "react";
import { useAuth } from "@/features/auth/provider";
import { PosterStackSkeleton } from "@/features/profile/skeleton";
import { BackdropHeroSkeleton } from "@/design/components/backdrop";
import {
  SectionHeaderSkeleton,
  SkeletonBlock,
  SkeletonLines,
  skeletonTextWidth,
  TabsSkeleton,
} from "@/design/components/skeleton";
import { cn } from "@/design/foundations/cn";
import {
  CONTAINER_CLASS,
  HEADLINE_BOX,
  HEADLINE_TYPE,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_BOX,
  PROSE_TYPE,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import {
  HERO_LIFT,
  HERO_REEL_WIDTHS,
  JOIN_POINT_LINES,
  LIST_TITLE_WIDTHS,
  MEMBER_NAME_WIDTHS,
  REVIEW_LINES,
  RISING_TITLES,
  ROW_ITEM_CLASS,
} from "./constants";

function Hero(): JSX.Element {
  return (
    <>
      <div className="relative">
        <BackdropHeroSkeleton />
      </div>

      <div className={cn(pageBodyClass(true), HERO_LIFT)}>
        <div className="flex w-full flex-col gap-10 sm:gap-12">
          <div className="flex min-w-0 flex-col">
            <SkeletonLines className={TONE.label} widths={["10.75rem"]} />
            <div className={cn(HEADLINE_BOX, HEADLINE_TYPE, "mt-5")}>
              <div className="h-[1lh] pt-[0.14em]">
                <SkeletonBlock className="h-[0.7em] w-[3.2em] max-w-full rounded-card" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="flex min-w-0 flex-col gap-4">
                <SkeletonLines className="type-body" widths={["17rem"]} />
                <SkeletonLines
                  className={`${PROSE_BOX} ${PROSE_TYPE}`}
                  phone={["100%", "100%", "100%", "45%"]}
                  widths={["100%", "100%", "36%"]}
                />
              </div>
              <SkeletonBlock className="h-11 w-[8.5rem] rounded-full" />
            </div>
          </div>

          <ol className="flex h-20 gap-2 sm:h-24 sm:gap-3 lg:h-28">
            {HERO_REEL_WIDTHS.map((width, index) => (
              <li
                className={cn("min-w-0 flex-1", index === 0 && "grow-[2.618]")}
                key={width}
              >
                <SkeletonBlock className="size-full rounded-card" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

function Pulse(): JSX.Element {
  return (
    <section className="flex w-full flex-col gap-6">
      <SkeletonLines className={TONE.label} widths={["10.5rem"]} />
      <div className="font-zuume flex max-w-5xl flex-col type-display-xs leading-none sm:type-display-sm lg:type-display-md">
        {["92%", "74%"].map((width) => (
          <div className="flex h-[1lh] items-center" key={width}>
            <SkeletonBlock
              className="h-[0.72em] rounded-thumb"
              style={{ width }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Index(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={skeletonTextWidth("Popular this week")} />
      <ol className="border-b border-rule">
        {RISING_TITLES.map((width, index) => (
          <li
            className="flex items-center gap-4 border-t border-rule py-3 sm:gap-6 sm:py-4"
            key={index}
          >
            <SkeletonBlock className="h-5 w-6 rounded-mark sm:h-7 sm:w-8" />
            <div className="font-zuume flex h-[1lh] min-w-0 flex-1 items-center type-display-xs leading-none sm:type-display-sm lg:type-display-md">
              <SkeletonBlock
                className="h-[0.7em] rounded-thumb"
                style={{ width: `calc(${width} * 2.4)`, maxWidth: "100%" }}
              />
            </div>
            <SkeletonBlock className="h-2 w-16 shrink-0 rounded-full" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PosterRow({
  actions,
  caption = "4.5rem",
  name,
}: {
  actions?: JSX.Element;
  caption?: string;
  name: string;
}): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={actions}
        title={skeletonTextWidth(name)}
      />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className={cn("flex shrink-0 flex-col gap-1.5", ROW_ITEM_CLASS)}
            key={index}
          >
            <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
            <div className="flex h-5 items-center">
              <SkeletonBlock
                className="h-2 rounded-full"
                style={{ width: caption }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reviews(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        title={skeletonTextWidth("Reviews worth reading")}
      />
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 border-b border-rule pb-12 lg:grid-cols-[11rem_minmax(0,1fr)] sm:pb-16">
        <div className="w-28 lg:w-full">
          <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <SkeletonBlock className="h-2.5 w-40 rounded-full" />
          <SkeletonLines
            className="max-w-[48ch] type-heading"
            phone={["100%", "100%", "100%", "62%"]}
            widths={["100%", "100%", "58%"]}
          />
          <div className="flex h-5 items-center gap-3">
            <SkeletonBlock className="size-5 shrink-0 rounded-full" />
            <SkeletonBlock className="h-2 w-16 rounded-full" />
            <SkeletonBlock className="h-[7px] w-14 rounded-full" />
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-12 pt-12 sm:grid-cols-2 sm:pt-16 lg:grid-cols-4">
        {REVIEW_LINES.slice(0, 4).map((lines, index) => (
          <li className="flex min-w-0 flex-col gap-4" key={index}>
            <div className="flex items-start gap-3">
              <SkeletonBlock className="aspect-[2/3] w-10 shrink-0 rounded-thumb" />
              <SkeletonLines className="type-copy" widths={["7rem", "5rem"]} />
            </div>
            <SkeletonLines
              className="type-copy"
              phone={["100%", "100%", "100%", lines.at(-1)!]}
              widths={lines}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rising(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={skeletonTextWidth("Rising on Guffin")} />
      <ol
        className={`flex flex-col divide-y ${TONE.rules} border-y border-rule`}
      >
        {RISING_TITLES.slice(0, 4).map((width, index) => (
          <li className="flex items-center gap-4 py-4 sm:gap-6" key={index}>
            <SkeletonBlock className="h-5 w-8 shrink-0 rounded-mark" />
            <SkeletonBlock className="aspect-[2/3] w-11 shrink-0 rounded-thumb" />
            <div className="flex w-60 min-w-0 shrink-0 flex-col gap-1">
              <SkeletonLines className="type-copy" widths={[width]} />
              <SkeletonLines className="type-meta" widths={["8.5rem"]} />
            </div>
            <SkeletonBlock className="hidden h-1.5 flex-1 rounded-mark sm:block" />
            <SkeletonBlock className="ml-auto h-7 w-12 shrink-0 rounded-mark" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Lists(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={skeletonTextWidth("Popular lists")} />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {LIST_TITLE_WIDTHS.map((width) => (
          <li className="flex min-w-0 flex-col gap-3" key={width}>
            <PosterStackSkeleton />
            <SkeletonLines className="type-base leading-6" widths={[width]} />
            <div className="flex h-5 items-center gap-x-4">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="size-5 shrink-0 rounded-full" />
                <SkeletonBlock className="h-2 w-16 rounded-full" />
              </div>
              <SkeletonBlock className="h-2 w-12 rounded-full" />
              <SkeletonBlock className="h-2 w-8 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Members({ name }: { name: string }): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={skeletonTextWidth(name)} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {MEMBER_NAME_WIDTHS.map((width) => (
          <li className="flex min-w-0 flex-col items-center gap-3" key={width}>
            <SkeletonBlock className="size-[72px] rounded-full" />
            <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
              <SkeletonLines className="type-copy" widths={[width]} />
              <SkeletonLines className="type-meta" widths={["4rem"]} />
            </div>
            <div className="flex w-full flex-col items-center">
              {["90%", "60%"].map((line) => (
                <div
                  className="flex h-4 w-full items-center justify-center"
                  key={line}
                >
                  <SkeletonBlock
                    className="h-[0.62em] rounded-full type-meta"
                    style={{ width: line }}
                  />
                </div>
              ))}
            </div>
            <SkeletonLines className="type-meta" widths={["7.5rem"]} />
            <SkeletonBlock className="mt-auto h-8 w-full max-w-36 rounded-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Join(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <div className="grid grid-cols-1 gap-12 border-t border-line pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col items-start gap-7">
          <SkeletonLines className={TONE.label} widths={["9.5rem"]} />
          <div
            className={`${HEADLINE_BOX} font-zuume w-full type-display-lg leading-none sm:type-display-xl lg:type-display-2xl`}
          >
            {["78%", "56%"].map((width) => (
              <div className="h-[1lh] pt-[0.14em]" key={width}>
                <SkeletonBlock
                  className="h-[0.7em] rounded-card"
                  style={{ width }}
                />
              </div>
            ))}
          </div>
          <SkeletonLines
            className="w-full max-w-[46ch] type-base leading-7"
            widths={["100%", "52%"]}
          />
          <SkeletonBlock className="h-11 w-[11.3rem] rounded-full" />
        </div>
        <ul className={`flex flex-col self-end divide-y ${TONE.rules}`}>
          {JOIN_POINT_LINES.map((phone, index) => (
            <li
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-5 first:pt-0"
              key={index}
            >
              <SkeletonLines className={TONE.label} widths={["3rem"]} />
              <SkeletonLines
                className="min-w-0 type-copy"
                phone={phone}
                widths={["100%", `${88 - index * 9}%`]}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HomeSkeleton(): JSX.Element {
  const { isAuthenticated, isReady } = useAuth();

  return (
    <main
      aria-busy="true"
      className={`ui-scene home-page overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic
    >
      <div className={CONTAINER_CLASS}>
        <Hero />

        <div className="mt-20 flex w-full flex-col gap-24 sm:mt-28 sm:gap-32">
          <Pulse />
          {isAuthenticated ? (
            <PosterRow caption="5.5rem" name="New from friends" />
          ) : null}
          <Index />
          <Reviews />
          <PosterRow
            actions={<TabsSkeleton chosen="89px" width="196px" />}
            caption="6rem"
            name="At the cinema"
          />
          <Rising />
          <PosterRow caption="6.5rem" name="Highest rated by members" />
          <Lists />
          <Members
            name={
              isAuthenticated ? "People you may know" : "Reviewers to follow"
            }
          />
          {isReady && !isAuthenticated ? <Join /> : null}
        </div>
      </div>
    </main>
  );
}
