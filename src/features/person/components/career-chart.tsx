"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/ui/cn";
import { TONE } from "@/ui";
import { POINTS, step } from "@/motion/engine";
import { DetailPart } from "@/features/detail";
import type { CareerYear } from "../types";

function labelStep(count: number) {
  const steps = [1, 2, 5, 10, 20, 50];
  return steps.find((each) => Math.ceil(count / each) <= 9) ?? 50;
}

const SLOT = "relative min-w-[3px] max-w-7 flex-1";
const EDGE_SLOTS = 2;

// The year read out rolls to the year under the hand on the first rung.
const ROLL_RUNG = 0;

function Roll({ year }: { year: number }) {
  const reduced = useReducedMotion();
  const shown = useMotionValue(year);
  const text = useTransform(shown, (value) => `${Math.round(value)}`);

  useEffect(() => {
    if (reduced) {
      shown.set(year);
      return;
    }
    const controls = animate(shown, year, {
      duration: step(ROLL_RUNG),
      ease: [...POINTS.expo],
    });
    return () => controls.stop();
  }, [reduced, shown, year]);

  return <motion.span>{text}</motion.span>;
}

const MAX_TITLES = 3;

export function Career({
  onOpen,
  peak,
  years,
}: {
  onOpen: (year: number) => void;
  peak: number;
  years: readonly CareerYear[];
}) {
  const [active, setActive] = useState(peak);
  const every = labelStep(years.length);
  const current = years.find((item) => item.year === active) ?? years[0];
  const hidden = Math.max(0, current.films.length - MAX_TITLES);

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
            <Roll year={current.year} />
          </span>
          <span className="flex min-w-0 flex-col gap-1 pb-0.5">
            <span className={`${TONE.label} text-ink-muted`}>
              {current.year === peak ? "Peak · " : ""}
              {current.count === 0
                ? "No films"
                : current.count === 1
                  ? "1 film"
                  : `${current.count} films`}
            </span>
            <span className="truncate type-body font-medium text-ink-body">
              {current.films.slice(0, MAX_TITLES).join(" · ") || " "}
              {hidden > 0 ? (
                <span className="text-ink-muted"> · +{hidden}</span>
              ) : null}
            </span>
          </span>
        </div>
      </DetailPart>

      <div
        aria-label="Films by year"
        className="relative flex h-40 items-end gap-[3px] sm:h-48"
        role="group"
      >
        <DetailPart
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
          name="tick"
        />
        {years.map((item, index) => (
          // Each bar opens up from the axis inside its own slot.
          <div className={cn(SLOT, "h-full overflow-hidden")} key={item.year}>
            <DetailPart
              className="flex h-full items-end"
              index={index}
              name="bar"
            >
              {item.count > 0 ? (
                <button
                  aria-label={`${item.year}: ${item.count} ${item.count === 1 ? "film" : "films"}, ${item.films[0]}`}
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
                </button>
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
          <span aria-hidden="true" className={SLOT} key={item.year}>
            {item.year % every === 0 ? (
              <span
                className={cn(
                  `absolute top-0 ${TONE.label} whitespace-nowrap text-ink-muted tabular-nums`,
                  (item.year / every) % 2 === 1 && "max-sm:hidden",
                  index < EDGE_SLOTS
                    ? "left-0"
                    : index >= years.length - EDGE_SLOTS
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
