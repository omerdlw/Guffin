"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "@/motion/time";
import { cn } from "../../foundations/cn";

/*
 * Indicators: a fill that slides after the pointer or the choice, on the
 * engine's `follow` spring. `SlidingHighlight` uses shared layout (one per
 * group, by `layoutId`); `SlidingPill` measures the chosen element and moves
 * to it, for a strip that scrolls.
 */

/** A shared-layout fill under the active row of a group. */
export function SlidingHighlight({
  className = "-z-10 rounded-card bg-fill",
  layoutId,
}: {
  className?: string;
  layoutId: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      layoutId={layoutId}
      transition={{
        layout: reducedMotion ? { duration: 0 } : SPRING.follow,
      }}
    />
  );
}

export interface PillBox {
  width: number;
  x: number;
}

/** Measures the element matching `selector` inside the list, again when `key` changes. */
export function useSlidingPill<T extends HTMLElement>(
  selector: string,
  key: unknown,
) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<PillBox | null>(null);

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const measure = () => {
      const chosen = list.querySelector<HTMLElement>(selector);
      if (!chosen) return;
      const next = { width: chosen.offsetWidth, x: chosen.offsetLeft };
      setBox((prev) =>
        prev && prev.x === next.x && prev.width === next.width ? prev : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => observer.disconnect();
  }, [key, selector]);

  return { box, ref };
}

/** The fill drawn under the measured element. */
export function SlidingPill({
  box,
  className,
}: {
  box: PillBox;
  className: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      animate={{ width: box.width, x: box.x }}
      aria-hidden="true"
      className={cn("pointer-events-none absolute left-0", className)}
      data-pill=""
      initial={false}
      transition={reduced ? { duration: 0 } : SPRING.follow}
    />
  );
}
