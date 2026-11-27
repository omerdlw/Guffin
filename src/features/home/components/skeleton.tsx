"use client";

import { DockClear } from "@/design/dock/clear";
import type { JSX, ReactNode } from "react";
import {
  SKELETON,
  SkeletonBlock,
  SkeletonButton,
  SkeletonText,
} from "@/design/components/skeleton";
import {
  CONTAINER_CLASS,
  HEADLINE_BOX,
  PAGE_CLASS,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { useAuth } from "@/features/auth/provider";
import { REVIEW_ROW } from "@/features/reviews/components/review-card";
import {
  CANON_LIMIT,
  CAPTION_CLASS,
  CRAFT,
  FEATURE_LIMIT,
  LIST_LIMIT,
  MEMBER_LIMIT,
  POPULAR_LIMIT,
  REEL_BLEED,
  REEL_CLASS,
  REEL_MARK_BOX,
  REEL_MASK,
  ROW_ITEM_CLASS,
} from "../model";

const range = (count: number) => Array.from({ length: count }, (_, i) => i);

function Bar({
  className,
  width,
}: {
  className?: string;
  width: string;
}): JSX.Element {
  return (
    <span className={cn("flex h-[1lh] min-w-0 items-center", className)}>
      <SkeletonBlock
        className="h-[0.62em] max-w-full rounded-full"
        style={{ width }}
      />
    </span>
  );
}

function Lines({
  className,
  phone,
  widths,
}: {
  className?: string;
  phone?: readonly string[];
  widths: readonly string[];
}): JSX.Element {
  return (
    <div aria-hidden="true" className={className}>
      {widths.map((width, index) => (
        <Bar
          className={phone ? "max-sm:hidden" : undefined}
          key={index}
          width={width}
        />
      ))}
      {phone?.map((width, index) => (
        <Bar className="sm:hidden" key={`phone-${index}`} width={width} />
      ))}
    </div>
  );
}

function Circle({ size }: { size: number }): JSX.Element {
  return (
    <SkeletonBlock
      className="shrink-0 rounded-full"
      style={{ height: size, width: size }}
    />
  );
}

function Heading({
  actions,
  title,
}: {
  actions?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <div className="relative z-10 mb-6 sm:mb-8">
      <div className="flex min-h-8 w-full flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <SkeletonText
            as="h2"
            className="min-w-0 font-zuume type-display-xs leading-none font-bold uppercase sm:type-display-sm"
            text={title}
          />
        </div>
        <div className="relative h-2 min-w-6 flex-1">
          <SkeletonBlock className="absolute inset-x-0 top-1/2 h-px" />
        </div>
        {actions ? (
          <div className="ml-auto max-w-full min-w-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function Poster({
  caption,
  radius = "rounded-card",
}: {
  caption?: ReactNode;
  radius?: string;
}): JSX.Element {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <SkeletonBlock className={cn("aspect-[2/3] w-full", radius)} />
      {caption}
    </div>
  );
}

function FaceStack(): JSX.Element {
  return (
    <span className="flex shrink-0">
      {range(3).map((index) => (
        <span className="not-first:-ml-1" key={index}>
          <Circle size={16} />
        </span>
      ))}
    </span>
  );
}

function Opening({ member }: { member: boolean }): JSX.Element {
  return (
    <div className={cn(REEL_CLASS, "relative flex flex-col justify-end")}>
      <div aria-hidden="true" className={cn(REEL_BLEED, "-bottom-24")}>
        <SkeletonBlock
          className="absolute inset-0 rounded-none"
          style={REEL_MASK}
        />
      </div>
      <div className="relative z-10 grid w-full grid-cols-1 items-end gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex max-w-[32rem] flex-col">
            <div className={REEL_MARK_BOX}>
              <SkeletonBlock className="h-20 w-[min(100%,22rem)] rounded-card sm:h-24 sm:w-[24rem]" />
            </div>
            <div className="mt-6 flex items-center gap-x-3 type-meta">
              <Bar width="2rem" />
              <Bar width="9.5rem" />
              <Bar width="3.5rem" />
            </div>
            <Lines
              className="mt-3 min-h-[2lh] max-w-[46ch] type-copy"
              widths={["100%", "78%"]}
            />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SkeletonButton icon label="Open film" size="lg" />
              {member ? (
                <SkeletonButton icon label="Your diary" size="lg" />
              ) : (
                <SkeletonButton label="Start your diary · free" size="lg" />
              )}
            </div>
          </div>
        </div>
        <ol className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1 sm:mx-0 sm:px-0 lg:justify-end">
          {range(FEATURE_LIMIT).map((index) => (
            <li
              className="shrink-0 lg:max-w-44 lg:min-w-0 lg:flex-1"
              key={index}
            >
              <span className="flex w-36 flex-col gap-2 sm:w-44 lg:w-full">
                <SkeletonBlock className="block aspect-video w-full rounded-tile" />
                <SkeletonBlock className="mx-[var(--radius-tile)] block h-0.5 rounded-full" />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Logged(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading
        actions={
          <span
            className={`${TONE.label} inline-flex items-center gap-2 text-ink-muted`}
          >
            <Circle size={8} />
            <SkeletonText text="Live" />
          </span>
        }
        title="Just logged"
      />
      <div className="mx-[calc(50%-50vw)]">
        <ul className="flex gap-3 overflow-hidden px-3 sm:gap-4 sm:px-4">
          {range(18).map((index) => (
            <li className="w-28 shrink-0 sm:w-32 lg:w-36" key={index}>
              <Poster
                caption={
                  <span className={CAPTION_CLASS}>
                    <Circle size={16} />
                    <Bar width="2.75rem" />
                    <Bar className="ml-auto shrink-0" width="3.5rem" />
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pitch(): JSX.Element {
  return (
    <section className="grid w-full grid-cols-1 overflow-hidden rounded-shell border border-rule bg-plate lg:min-h-[30rem] lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center gap-6 p-8 sm:p-10">
        <SkeletonBlock className="size-11 rounded-full" />
        <SkeletonText as="p" className={TONE.label} text="The film diary" />
        <h2 className="text-balance">
          <SkeletonText
            className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold uppercase sm:type-display-lg`}
            text="Every film you’ve seen."
          />
          <SkeletonText
            className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold uppercase sm:type-display-lg`}
            text="Every one you’re about to."
          />
        </h2>
        <SkeletonText
          as="p"
          className="max-w-[40ch] type-copy text-pretty"
          text="Log what you watch, rate it, write about it and keep lists worth sharing. 1,000 members already do."
        />
        <div className="flex">
          <SkeletonButton label="Start your diary · it’s free" size="lg" />
        </div>
      </div>
      <SkeletonBlock className="h-80 min-w-0 rounded-none sm:h-96 lg:h-auto" />
    </section>
  );
}

function Craft(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading title="What you can do here" />
      <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {CRAFT.map((item, index) => (
          <li
            className="flex min-w-0 flex-col gap-4 border-t border-rule py-8"
            key={item.verb}
          >
            <div className="flex items-center justify-between gap-4">
              <SkeletonText
                className={`${TONE.label} tabular-nums`}
                text={String(index + 1).padStart(2, "0")}
              />
              <Circle size={18} />
            </div>
            <SkeletonText
              as="h3"
              className="font-zuume type-display-sm leading-none font-bold uppercase"
              text={item.verb}
            />
            <SkeletonText
              as="p"
              className="max-w-[36ch] type-copy text-pretty"
              text={item.text}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Popular(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading title="Popular with members" />
      <ul className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
        {range(POPULAR_LIMIT).map((index) => (
          <li key={index}>
            <Poster
              caption={
                <span className={CAPTION_CLASS}>
                  <FaceStack />
                  <Bar width="1.5rem" />
                  <Bar className="ml-auto shrink-0" width="1.6rem" />
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Byline(): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 type-control">
      <span className="flex min-w-0 items-center gap-2">
        <Circle size={20} />
        <Bar width="6rem" />
      </span>
      <Bar className="type-meta" width="4.5rem" />
      <Bar className="type-meta" width="3.5rem" />
    </div>
  );
}

function Reviews(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading title="Popular reviews" />
      <div className="grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <article className="flex min-w-0 flex-col gap-8">
          <SkeletonBlock className="aspect-[16/9] w-full rounded-panel" />
          <div className="flex flex-col gap-6">
            <Lines
              className="max-w-[44ch] type-heading font-medium"
              phone={["100%", "100%", "100%", "100%", "100%", "45%"]}
              widths={["100%", "100%", "100%", "62%"]}
            />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Byline />
              <Bar className="type-meta" width="2.25rem" />
              <SkeletonText
                className="type-meta font-medium"
                text="Read review"
              />
            </div>
          </div>
        </article>
        <ul className="flex flex-col">
          {range(3).map((index) => (
            <li className={REVIEW_ROW} key={index}>
              <div className="flex min-w-0 gap-fib-3 sm:gap-fib-4">
                <div className="w-14 shrink-0 self-start sm:w-[4.5rem]">
                  <Poster radius="rounded-tile" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-fib-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-fib-2 gap-y-1">
                    <Bar className="type-base" width="5rem" />
                    <Bar className="type-base" width="9rem" />
                    <Bar className="type-meta" width="3rem" />
                  </div>
                  <Lines
                    className="max-w-[65ch] type-body leading-6"
                    widths={["100%", "100%", "100%", "48%"]}
                  />
                  <div className="flex items-center gap-5">
                    <Bar className="type-meta" width="2.25rem" />
                    <SkeletonText
                      className="type-meta font-medium"
                      text="Read"
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Canon(): JSX.Element {
  const half = CANON_LIMIT / 2;
  return (
    <section className="flex w-full flex-col">
      <Heading title="Highest rated by members" />
      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
        {range(2).map((side) => (
          <ol
            className={`flex flex-col divide-y ${TONE.rules} border-t border-rule max-lg:not-first:border-t-0 lg:border-b`}
            key={side}
          >
            {range(half).map((index) => (
              <li
                className="grid grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4"
                key={index}
              >
                <SkeletonText
                  className="text-right font-zuume type-display-xs leading-none font-bold tabular-nums"
                  text={String(side * half + index + 1)}
                />
                <Poster radius="rounded-thumb" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Bar className="type-copy" width="9.5rem" />
                  <Bar className="type-meta" width="5rem" />
                </div>
                <span className="flex items-center gap-1.5">
                  <SkeletonText
                    className="font-zuume type-display-xs leading-none font-bold tabular-nums"
                    text="4.50"
                  />
                  <Circle size={14} />
                </span>
              </li>
            ))}
          </ol>
        ))}
      </div>
    </section>
  );
}

function Row({
  actions,
  caption,
  title,
}: {
  actions?: ReactNode;
  caption?: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading actions={actions} title={title} />
      <div className="relative w-full">
        <div className="flex gap-3 overflow-hidden">
          {range(5).map((index) => (
            <div className={cn("shrink-0", ROW_ITEM_CLASS)} key={index}>
              <Poster caption={caption} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showing(): JSX.Element {
  return (
    <Row
      actions={<SkeletonBlock className="h-8 w-[12.5rem] rounded-full" />}
      caption={
        <span className="mt-1 flex min-w-0 flex-col gap-1.5 border-t border-dashed border-line pt-3">
          <SkeletonText
            className="font-zuume type-display-xs leading-none font-bold uppercase tabular-nums"
            text="Nov 13"
          />
          <SkeletonText className="type-meta font-medium" text="In theatres" />
        </span>
      }
      title="At the cinema"
    />
  );
}

function PosterStack(): JSX.Element {
  return (
    <div className="flex w-full rounded-thumb">
      {range(5).map((slot) => (
        <div
          className={`${SKELETON.solid} relative aspect-[2/3] w-[28%] shrink-0 rounded-thumb not-first:-ml-[10%]`}
          key={slot}
          style={{ zIndex: 5 - slot }}
        >
          <span className="absolute inset-0 rounded-[inherit] ring-1 ring-edge-hover ring-inset" />
        </div>
      ))}
    </div>
  );
}

function Lists(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {range(LIST_LIMIT).map((index) => (
          <li className="flex min-w-0 flex-col gap-4" key={index}>
            <PosterStack />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Bar className="type-title font-semibold" width="70%" />
              <Lines className="type-body" widths={["82%"]} />
            </div>
            <div className="flex min-w-0 items-center gap-x-4 type-control">
              <span className="flex min-w-0 items-center gap-2">
                <Circle size={20} />
                <Bar width="5.5rem" />
              </span>
              <Bar className="shrink-0" width="3.25rem" />
              <Bar className="shrink-0" width="1.75rem" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Members({ member }: { member: boolean }): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <Heading title={member ? "People you may know" : "Reviewers to follow"} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {range(MEMBER_LIMIT).map((index) => (
          <li
            className="flex min-w-0 flex-col items-center gap-3 text-center"
            key={index}
          >
            <Circle size={72} />
            <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
              <Bar className="type-copy font-semibold" width="6.5rem" />
              <Bar className="type-meta" width="5rem" />
            </div>
            <Lines
              className="flex min-h-8 flex-col items-center type-meta"
              widths={["8.5rem", "5.5rem"]}
            />
            <Bar className="type-meta" width="8rem" />
            <div className="mt-auto w-full max-w-36">
              <SkeletonButton className="w-full" label="Follow" size="sm" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Join(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SkeletonBlock className="h-px w-full" />
      <div className="grid grid-cols-1 items-end gap-x-16 gap-y-8 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <SkeletonText as="p" className={TONE.label} text="Roll credits" />
          <SkeletonText
            as="h2"
            className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance uppercase sm:type-display-xl lg:type-display-2xl`}
            text="Start your diary tonight"
          />
        </div>
        <div className="flex flex-col items-start gap-6">
          <SkeletonText
            as="p"
            className="max-w-[40ch] type-base leading-7 text-pretty"
            text="Join 1,000 members who keep track of what they watch. It’s free, and your first film takes a minute to log."
          />
          <SkeletonButton label="Create your account" size="lg" />
        </div>
      </div>
    </section>
  );
}

export function HomeSkeleton(): JSX.Element {
  const auth = useAuth();
  const member = auth.isAuthenticated;

  return (
    <main
      aria-busy="true"
      className={`home-page overflow-x-clip ${PAGE_CLASS}`}
      id="main"
    >
      <DockClear extra="2rem" />
      <span className="sr-only">Loading</span>
      <div className={CONTAINER_CLASS}>
        <Opening member={member} />
        <div className="mt-6 flex w-full flex-col gap-24 sm:mt-8 sm:gap-32">
          <Logged />
          {member ? null : (
            <>
              <Pitch />
              <Craft />
            </>
          )}
          <Popular />
          <Reviews />
          <Canon />
          <Showing />
          <Lists />
          <Members member={member} />
          {member ? null : <Join />}
        </div>
      </div>
    </main>
  );
}
