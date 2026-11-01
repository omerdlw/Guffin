"use client";

import type { JSX } from "react";
import { cn } from "@/ui/cn";
import { PosterStackSkeleton } from "@/features/account";
import { useAuth } from "@/features/auth";
import {
  BackdropHeroSkeleton,
  CONTAINER_CLASS,
  HEADLINE_BOX,
  HEADLINE_TYPE,
  PAGE_CLASS,
  PROSE_BOX,
  PROSE_TYPE,
  SectionHeaderSkeleton,
  SkeletonBlock,
  SkeletonLines,
  TabsSkeleton,
  TONE,
  pageBodyClass,
} from "@/ui";

const ROW_ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]";

const title = (text: string) => `${(text.length * 8.2) / 16}rem`;

function Hero(): JSX.Element {
  return (
    <>
      <div className="relative">
        <BackdropHeroSkeleton />
      </div>

      <div className={pageBodyClass(true)}>
        <div className="grid w-full grid-cols-1 items-end gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col">
            <SkeletonLines className={TONE.label} widths={["10.75rem"]} />
            <div className={cn(HEADLINE_BOX, HEADLINE_TYPE, "mt-4")}>
              <div className="h-[1lh] pt-[0.14em]">
                <SkeletonBlock className="h-[0.7em] w-[3.2em] max-w-full rounded-card" />
              </div>
            </div>
            <SkeletonLines className="mt-4 type-body" widths={["17rem"]} />
            <SkeletonLines
              className={`mt-5 ${PROSE_BOX} ${PROSE_TYPE}`}
              phone={["100%", "100%", "100%", "45%"]}
              widths={["100%", "100%", "36%"]}
            />
            <div className="mt-6 flex items-center">
              <SkeletonBlock className="h-10 w-[7.5rem] rounded-full" />
            </div>
          </div>

          <ol className="grid grid-cols-5 gap-2 lg:flex lg:flex-col lg:gap-0">
            {["7.5rem", "10rem", "6rem", "9rem", "8rem"].map((width, index) => (
              <li
                className="relative flex w-full flex-col py-3 lg:flex-row lg:items-center lg:gap-4 lg:py-3.5"
                key={index}
              >
                <div className="hidden h-5 items-center gap-4 lg:flex">
                  <SkeletonBlock className="h-[7px] w-3.5 rounded-full" />
                  <SkeletonBlock
                    className="h-2.5 rounded-full"
                    style={{ width }}
                  />
                </div>
                <SkeletonBlock className="absolute inset-x-0 bottom-0 h-0.5 lg:h-px" />
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
    <section className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <SkeletonLines className="type-title" widths={["10.5rem"]} />
        <SkeletonLines
          className="type-body"
          phone={["100%", "55%"]}
          widths={["26rem"]}
        />
      </div>
      <div className="grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x [&>div]:py-3 sm:[&>div]:px-6 sm:[&>div:first-child]:pl-0">
        {["6.25rem", "7.25rem", "7.75rem", "4.25rem"].map((label) => (
          <div className="flex flex-col gap-1.5" key={label}>
            <SkeletonLines className={TONE.label} widths={[label]} />
            <div className="font-zuume flex h-[1lh] items-center type-display-xs leading-none sm:type-display-sm">
              <SkeletonBlock className="h-[0.72em] w-[1.6em] rounded-thumb" />
            </div>
          </div>
        ))}
      </div>
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
      <SectionHeaderSkeleton actions={actions} title={title(name)} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className={cn("flex shrink-0 flex-col gap-1.5", ROW_ITEM)}
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

const REVIEW_LINES = [
  ["100%", "100%", "100%", "64%"],
  ["100%", "100%", "42%"],
  ["100%", "100%", "100%", "78%"],
  ["100%", "100%", "100%", "30%"],
  ["100%", "86%"],
  ["100%", "100%", "100%", "56%"],
] as const;

function Reviews(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={title("Reviews worth reading")} />
      <ul
        className={`-my-6 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} lg:grid-cols-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-rule lg:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {REVIEW_LINES.map((lines, index) => (
          <li className="flex gap-4 py-6 sm:gap-5" key={index}>
            <div className="w-16 shrink-0 sm:w-20">
              <SkeletonBlock className="aspect-[2/3] w-full rounded-tile" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex h-6 items-center gap-2">
                <SkeletonBlock className="h-2.5 w-36 rounded-full" />
                <SkeletonBlock className="h-2 w-8 rounded-full" />
              </div>
              <div className="flex h-5 items-center gap-2.5">
                <SkeletonBlock className="size-5 shrink-0 rounded-full" />
                <SkeletonBlock className="h-2 w-12 rounded-full" />
                <SkeletonBlock className="h-2 w-16 rounded-full" />
                <SkeletonBlock className="h-[7px] w-14 rounded-full" />
              </div>
              <SkeletonLines
                className="type-copy leading-7"
                phone={["100%", "100%", "100%", lines.at(-1)!]}
                widths={lines}
              />
              <div className="flex h-4 items-center gap-4">
                <SkeletonBlock className="h-[7px] w-12 rounded-full" />
                <SkeletonBlock className="h-[7px] w-16 rounded-full" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const RISING_TITLES = [
  "9rem",
  "7rem",
  "11rem",
  "8rem",
  "10rem",
  "6.5rem",
  "8.5rem",
  "9.5rem",
];

function Rising(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={title("Rising on Guffin")} />
      <ol
        className={`-my-4 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} sm:grid-cols-2 sm:divide-y-0 sm:[&>li]:border-b sm:[&>li]:border-rule sm:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {RISING_TITLES.map((width, index) => (
          <li className="flex items-center gap-4 py-4" key={index}>
            <div className="font-zuume flex h-[1lh] w-9 shrink-0 items-center justify-end type-display-xs leading-none">
              <SkeletonBlock className="h-[0.72em] w-[0.42em] rounded-mark" />
            </div>
            <div className="w-11 shrink-0">
              <SkeletonBlock className="aspect-[2/3] w-full rounded-thumb" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <SkeletonLines className="type-copy" widths={[width]} />
              <SkeletonLines className="type-meta" widths={["8.5rem"]} />
            </div>
            <SkeletonBlock className="h-6 w-12 shrink-0 rounded-full" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Lists(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={title("Popular lists")} />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {["11rem", "8.5rem", "13rem", "9.5rem", "12rem", "7.5rem"].map(
          (width) => (
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
          ),
        )}
      </ul>
    </section>
  );
}

function Members({ name }: { name: string }): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={title(name)} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {["5.5rem", "4.5rem", "6rem", "5rem", "6.5rem", "4.75rem"].map(
          (width) => (
            <li
              className="flex min-w-0 flex-col items-center gap-3"
              key={width}
            >
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
          ),
        )}
      </ul>
    </section>
  );
}

function Join(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <div className="grid grid-cols-1 gap-10 border-t border-rule pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <div
            className={`${HEADLINE_BOX} font-zuume w-full type-display-md leading-none sm:type-display-lg`}
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
        <ul className="grid grid-cols-1 gap-5 self-center sm:grid-cols-2">
          {[["100%", "34%"], ["96%"], ["92%"], ["88%"]].map((phone, index) => (
            <li className="flex items-start gap-3" key={index}>
              <SkeletonBlock className="mt-0.5 size-8 shrink-0 rounded-full" />
              <SkeletonLines
                className="min-w-0 flex-1 type-copy"
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

        <div className="mt-16 flex w-full flex-col gap-16 sm:mt-20 sm:gap-20">
          <Pulse />
          {isAuthenticated ? (
            <PosterRow caption="5.5rem" name="New from friends" />
          ) : null}
          <PosterRow name="Popular this week" />
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
