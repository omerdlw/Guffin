"use client";

import type { JSX } from "react";
import { useAuth } from "@/features/auth/provider";
import { BackdropHeroSkeleton } from "@/design/components/backdrop";
import {
  SectionHeaderSkeleton,
  SkeletonBlock,
  SkeletonLines,
  skeletonTextWidth,
} from "@/design/components/skeleton";
import { cn } from "@/design/foundations/cn";
import {
  CONTAINER_CLASS,
  HEADLINE_BOX,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_BOX,
  PROSE_TYPE,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { CRAFT, HERO_LIFT, POPULAR_LIMIT } from "./constants";

const HEADLINE_ROWS = ["5.9em", "6.6em"];

function Opening({ guest }: { guest: boolean }): JSX.Element {
  return (
    <>
      <div className="relative">
        <BackdropHeroSkeleton />
      </div>
      <div className={cn(pageBodyClass(true), HERO_LIFT)}>
        <div className="flex w-full flex-col">
          <SkeletonLines className={TONE.label} widths={["7.5rem"]} />
          <div
            className={`${HEADLINE_BOX} mt-5 font-zuume type-display-lg leading-none sm:type-display-xl lg:type-display-2xl`}
          >
            {HEADLINE_ROWS.map((width) => (
              <div className="h-[1lh] pt-[0.14em]" key={width}>
                <SkeletonBlock
                  className="h-[0.7em] max-w-full rounded-card"
                  style={{ width }}
                />
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-7">
            <SkeletonLines
              className={`${PROSE_BOX} ${PROSE_TYPE} max-w-[52ch]`}
              phone={["100%", "100%", "100%", "40%"]}
              widths={["100%", "100%", "62%"]}
            />
            <div className="flex gap-3">
              {guest ? (
                <SkeletonBlock className="h-control-lg w-[11.5rem] rounded-full" />
              ) : null}
              <SkeletonBlock className="h-control-lg w-[11rem] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Logged(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={skeletonTextWidth("Just logged")} />
      <div className="mx-[calc(50%-50vw)] flex gap-3 overflow-hidden sm:gap-4">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            className="flex w-28 shrink-0 flex-col gap-2.5 sm:w-32 lg:w-36"
            key={index}
          >
            <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
            <SkeletonBlock className="h-3 w-3/4 rounded-mark" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Craft(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        title={skeletonTextWidth("What you can do here")}
      />
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {CRAFT.map((item) => (
          <div
            className="flex flex-col gap-4 border-t border-rule py-8"
            key={item.verb}
          >
            <SkeletonLines className={TONE.label} widths={["1.25rem"]} />
            <div className="flex h-[1lh] items-center font-zuume type-display-sm leading-none">
              <SkeletonBlock
                className="h-[0.7em] rounded-thumb"
                style={{ width: `${item.verb.length * 0.42}em` }}
              />
            </div>
            <SkeletonLines
              className="max-w-[36ch] type-copy"
              widths={["100%", "58%"]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Popular(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        title={skeletonTextWidth("Popular with members")}
      />
      <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
        {Array.from({ length: POPULAR_LIMIT }, (_, index) => (
          <div className="flex flex-col gap-2.5" key={index}>
            <SkeletonBlock className="aspect-[2/3] w-full rounded-card" />
            <SkeletonBlock className="h-3 w-2/3 rounded-mark" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeSkeleton(): JSX.Element {
  const auth = useAuth();
  const guest = !auth.isAuthenticated;

  return (
    <main
      aria-busy="true"
      className={`home-page overflow-x-clip ${PAGE_CLASS}`}
      id="main"
    >
      <span className="sr-only">Loading</span>
      <div className={CONTAINER_CLASS}>
        <Opening guest={guest} />
        <div className="mt-20 flex w-full flex-col gap-24 sm:mt-28 sm:gap-32">
          <Logged />
          {guest ? <Craft /> : null}
          <Popular />
        </div>
      </div>
    </main>
  );
}
