"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { PosterThumb } from "@/features/artwork/artwork";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import type { MediaType } from "@/features/media/types";
import { mediaHref } from "@/lib/project";
import { POINTS } from "@/motion/constants";
import { useEngine } from "@/motion/react";
import { clamp, layoutTop, step } from "@/motion/utils";
import { Button } from "@/design/components/button";
import {
  HighlightGroup,
  useHighlight,
} from "@/design/components/highlight-group";
import { DockLink, TextButton } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { cn } from "@/design/foundations/cn";
import { TONE } from "@/design/foundations/tones";
import {
  CAREER_EDGE_SLOTS,
  CAREER_ROLL_RUNG,
  CAREER_SLOT_CLASS,
  MAX_TIMELINE_TITLES,
  TIMELINE_SPINE_CLASS,
} from "./constants";
import { PersonMediumControl, usePersonView } from "./views";
import type {
  ByMedium,
  Career as CareerData,
  CareerYear,
  TimelineCredit,
  TimelineYear,
} from "./types";
import { chartLabelStep, filmCountLabel } from "./utils";

function YearRoll({ year }: { year: number }) {
  const reduced = useReducedMotion();
  const shown = useMotionValue(year);
  const text = useTransform(shown, (value) => `${Math.round(value)}`);

  useEffect(() => {
    if (reduced) {
      shown.set(year);
      return;
    }
    const controls = animate(shown, year, {
      duration: step(CAREER_ROLL_RUNG),
      ease: [...POINTS.expo],
    });
    return () => controls.stop();
  }, [reduced, shown, year]);

  return <motion.span>{text}</motion.span>;
}

function CareerChart({
  medium,
  onOpen,
  peak,
  years,
}: {
  medium: MediaType;
  onOpen: (year: number) => void;
  peak: number;
  years: readonly CareerYear[];
}) {
  const [active, setActive] = useState(peak);
  const every = chartLabelStep(years.length);
  const current = years.find((item) => item.year === active) ?? years[0];
  const hidden = Math.max(0, current.films.length - MAX_TIMELINE_TITLES);

  const choose = (item: CareerYear, event: MouseEvent<HTMLButtonElement>) => {
    const native = event.nativeEvent;
    if (
      native instanceof PointerEvent &&
      (native.pointerType === "touch" || native.pointerType === "pen")
    ) {
      return;
    }
    onOpen(item.year);
  };

  return (
    <div className="flex flex-col gap-5" onPointerLeave={() => setActive(peak)}>
      <DetailPart className="flex min-h-14 items-end gap-6" name="readout">
        <div className="flex min-w-0 items-end gap-5">
          <span className="font-zuume type-display-sm leading-crop font-bold text-ink tabular-nums sm:type-display-md">
            <YearRoll year={current.year} />
          </span>
          <span className="flex min-w-0 flex-col gap-1 pb-0.5">
            <span className={`${TONE.label} text-ink-muted`}>
              {current.year === peak ? "Peak · " : ""}
              {filmCountLabel(current.count, medium)}
            </span>
            <span className="truncate type-body font-medium text-ink-body">
              {current.films.slice(0, MAX_TIMELINE_TITLES).join(" · ") || " "}
              {hidden > 0 ? (
                <span className="text-ink-muted"> · +{hidden}</span>
              ) : null}
            </span>
          </span>
        </div>
      </DetailPart>

      <div
        aria-label={medium === "tv" ? "Shows by year" : "Films by year"}
        className="relative flex h-40 items-end gap-[3px] sm:h-48"
        role="group"
      >
        <DetailPart
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
          name="tick"
        />
        {years.map((item, index) => (
          <div
            className={cn(CAREER_SLOT_CLASS, "h-full overflow-hidden")}
            key={item.year}
          >
            <DetailPart
              className="flex h-full items-end"
              index={index}
              name="bar"
            >
              {item.count > 0 ? (
                <Button
                  aria-label={`${item.year}: ${filmCountLabel(item.count, medium)}, ${item.films[0]}`}
                  className="group flex h-full w-full cursor-pointer items-end outline-none"
                  data-own-focus=""
                  data-cursor="idle"
                  onClick={(event) => choose(item, event)}
                  onFocus={() => setActive(item.year)}
                  onPointerEnter={() => setActive(item.year)}
                  type="button"
                >
                  <span
                    className={cn(
                      "cine-fade relative block w-full rounded-t-mark group-focus-visible:bg-ink",
                      item.year === peak
                        ? "bg-grade"
                        : item.year === active
                          ? "bg-ink"
                          : "bg-ink-faint",
                    )}
                    style={{ height: `${Math.max(item.weight, 0.05) * 100}%` }}
                  />
                </Button>
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-0.5 w-full rounded-full bg-line"
                />
              )}
            </DetailPart>
          </div>
        ))}
      </div>

      <DetailPart className="-mt-3 flex h-4 gap-[3px]" name="tick">
        {years.map((item, index) => (
          <span
            aria-hidden="true"
            className={CAREER_SLOT_CLASS}
            key={item.year}
          >
            {item.year % every === 0 ? (
              <span
                className={cn(
                  `absolute top-0 ${TONE.label} whitespace-nowrap text-ink-muted tabular-nums`,
                  (item.year / every) % 2 === 1 && "max-sm:hidden",
                  index < CAREER_EDGE_SLOTS
                    ? "left-0"
                    : index >= years.length - CAREER_EDGE_SLOTS
                      ? "right-0 -mr-(--tracking-label)"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                {item.year}
              </span>
            ) : null}
          </span>
        ))}
      </DetailPart>
    </div>
  );
}

export function PersonCareer({
  careers,
}: {
  careers: ByMedium<CareerData | null>;
}) {
  const { medium, openTimeline } = usePersonView();
  const career = careers[medium];

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf" now>
      <Heading
        actions={
          <div className="flex items-center gap-4">
            {career ? (
              <TextButton
                className="hidden items-center gap-1.5 sm:flex"
                onClick={() => openTimeline(career.peak)}
                variant="label"
              >
                In the timeline
                <Icon icon="solar:alt-arrow-right-linear" size={14} />
              </TextButton>
            ) : null}
            <PersonMediumControl />
          </div>
        }
        icon="solar:chart-2-bold"
        title="Career"
      />
      <DetailSwap cue="chart" id={medium} now>
        {career ? (
          <CareerChart
            medium={medium}
            onOpen={openTimeline}
            peak={career.peak}
            years={career.years}
          />
        ) : (
          <DetailPart
            className="flex h-56 items-center justify-center type-body text-ink-muted"
            name="readout"
          >
            Too few dated {medium === "tv" ? "shows" : "films"} to chart yet
          </DetailPart>
        )}
      </DetailSwap>
    </DetailSection>
  );
}

function TimelineRow({
  credit,
  highlightKey,
}: {
  credit: TimelineCredit;
  highlightKey: string;
}) {
  const href = mediaHref(credit.mediaType, credit.id);
  const highlight = useHighlight(
    highlightKey,
    "rounded-tile bg-fill-hover ring-1 ring-edge-hover ring-inset",
  );

  return (
    <DockLink
      className="group relative isolate flex items-center gap-4 rounded-tile p-1 pr-3"
      href={href}
      {...highlight.props}
    >
      {highlight.node}
      <PosterThumb
        className="pointer-events-none relative z-10 w-14 rounded-thumb sm:w-16"
        kind={credit.mediaType}
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
    </DockLink>
  );
}

function SpineProgress({ list }: { list: HTMLOListElement | null }) {
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

export function PersonTimeline({ years }: { years: TimelineYear[] }) {
  const [list, setList] = useState<HTMLOListElement | null>(null);
  if (years.length === 0) return null;

  const films = years.reduce((total, { credits }) => total + credits.length, 0);

  return (
    <DetailSection className="flex w-full flex-col" cue="timeline">
      <Heading icon="solar:sort-by-time-bold" title={`Timeline (${films})`} />

      <HighlightGroup>
        <ol className="relative flex flex-col" ref={setList}>
          <DetailPart
            className={`absolute top-2 bottom-0 w-px bg-line ${TIMELINE_SPINE_CLASS}`}
            name="spine"
          >
            <SpineProgress list={list} />
          </DetailPart>
          {years.map(({ credits, year }, index) => (
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
                  className={`absolute top-1.5 z-10 size-3 -translate-x-1/2 rounded-full bg-ink ${TIMELINE_SPINE_CLASS}`}
                  name="stamp"
                />
                <ul className="flex min-w-0 flex-1 flex-col gap-1 pl-4 sm:pl-6">
                  {credits.map((credit, at) => (
                    <DetailPart
                      as="li"
                      index={at}
                      key={credit.key}
                      name="entry"
                    >
                      <TimelineRow
                        credit={credit}
                        highlightKey={`${year ?? "undated"}:${credit.key}`}
                      />
                    </DetailPart>
                  ))}
                </ul>
              </DetailSection>
            </li>
          ))}
        </ol>
      </HighlightGroup>
    </DetailSection>
  );
}
