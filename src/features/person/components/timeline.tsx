"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGroup } from "motion/react";
import { movieHref } from "@/config/routes";
import { PosterThumb } from "@/features/artwork";
import { DetailPart, DetailSection, Heading } from "@/features/detail";
import { clamp, useEngine } from "@/motion/engine";
import { layoutTop } from "@/motion/layout-flow";
import type { TimelineCredit, TimelineYear } from "../types";
import { useDockLinkClick } from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";

function TimelineRow({
  credit,
  highlighted,
  onFocus,
  onPointerEnter,
}: {
  credit: TimelineCredit;
  highlighted: boolean;
  onFocus: () => void;
  onPointerEnter: () => void;
}) {
  const href = movieHref(credit.id);
  const handleClick = useDockLinkClick(href);

  return (
    <Link
      className="group relative isolate flex items-center gap-4 rounded-tile p-1 pr-3"
      href={href}
      onClick={handleClick}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      prefetch={false}
    >
      {highlighted ? (
        <SlidingHighlight
          className="rounded-tile bg-fill-hover ring-1 ring-edge-hover ring-inset"
          layoutId="timeline-row-highlight"
        />
      ) : null}
      <PosterThumb
        className="pointer-events-none relative z-10 w-14 rounded-thumb sm:w-16"
        movieId={credit.id}
        original
        posterPath={credit.posterPath}
      />
      <span className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate type-body font-semibold text-ink sm:type-base">
          {credit.title}
        </span>
        {credit.detail ? (
          <span className="truncate type-meta text-ink-muted sm:type-body">
            {credit.detail}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

// The spine fills in as the list is read: from when its top passes the lower
// part of the window to when its end is reached, or the page ends.
function Progress({ list }: { list: HTMLOListElement | null }) {
  const engine = useEngine();
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!list) return;
    let start = 0;
    let end = 1;
    const draw = (y: number) => {
      const progress = clamp((y - start) / (end - start), 0, 1);
      if (fill.current) fill.current.style.transform = `scaleY(${progress})`;
    };
    const measure = () => {
      const view = window.innerHeight;
      const furthest = document.documentElement.scrollHeight - view;
      start = layoutTop(list) - view * 0.6;
      end = Math.max(start + 1, Math.min(start + list.offsetHeight, furthest));
      draw(engine.scroll.get());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    const stop = engine.scroll.subscribe(draw);
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [engine, list]);

  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 origin-top bg-ink-muted"
      ref={fill}
      style={{ transform: "scaleY(0)" }}
    />
  );
}

const SPINE = "left-14 sm:left-20";

export function PersonTimeline({ years }: { years: TimelineYear[] }) {
  const [list, setList] = useState<HTMLOListElement | null>(null);
  const highlightGroupId = useId();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const activeRow = hoveredRow ?? focusedRow;
  if (years.length === 0) return null;

  const films = years.reduce((total, { credits }) => total + credits.length, 0);

  return (
    <DetailSection className="flex w-full flex-col" cue="timeline">
      <Heading icon="solar:sort-by-time-bold" title={`Timeline (${films})`} />

      <LayoutGroup id={`person-timeline-${highlightGroupId}`}>
        <ol
          className="relative flex flex-col"
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              setFocusedRow(null);
            }
          }}
          onPointerLeave={() => setHoveredRow(null)}
          ref={setList}
        >
          <DetailPart
            className={`absolute top-2 bottom-0 w-px bg-line ${SPINE}`}
            name="spine"
          >
            <Progress list={list} />
          </DetailPart>
          {years.map(({ credits, year }, index) => (
            // Each year comes in as it is reached: its stamp on the spine,
            // then its films.
            <li data-year={year ?? "undated"} key={year ?? "undated"}>
              <DetailSection
                as="div"
                className={`relative flex ${index === years.length - 1 ? "" : "pb-8"}`}
                cue="year"
              >
                <DetailPart
                  className="w-14 shrink-0 pt-1 pr-3 text-right sm:w-20 sm:pr-4"
                  name="stamp"
                >
                  <h3 className="type-meta font-bold text-ink-muted tabular-nums sm:type-body">
                    {year ?? "—"}
                  </h3>
                </DetailPart>
                <DetailPart
                  className={`absolute top-1.5 z-10 size-3 -translate-x-1/2 rounded-full bg-ink ${SPINE}`}
                  name="stamp"
                />
                <ul className="flex min-w-0 flex-1 flex-col gap-1 pl-4 sm:pl-6">
                  {credits.map((credit, at) => {
                    const rowId = `${year ?? "undated"}:${credit.key}`;
                    return (
                      <DetailPart
                        as="li"
                        index={at}
                        key={credit.key}
                        name="entry"
                      >
                        <TimelineRow
                          credit={credit}
                          highlighted={activeRow === rowId}
                          onFocus={() => setFocusedRow(rowId)}
                          onPointerEnter={() => setHoveredRow(rowId)}
                        />
                      </DetailPart>
                    );
                  })}
                </ul>
              </DetailSection>
            </li>
          ))}
        </ol>
      </LayoutGroup>
    </DetailSection>
  );
}
